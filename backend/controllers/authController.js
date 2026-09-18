const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  parseDurationToMs,
} = require('../utils/generateTokens');

const isProd = process.env.NODE_ENV === 'production';
const REFRESH_MAX_AGE = parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d');

function shortDeviceLabel(userAgent = '') {
  // A tiny, dependency-free UA summary - just enough to tell devices
  // apart in a "manage sessions" list. Not meant to be precise.
  if (/mobile/i.test(userAgent)) return 'Mobile browser';
  if (/chrome/i.test(userAgent)) return 'Chrome browser';
  if (/firefox/i.test(userAgent)) return 'Firefox browser';
  if (/safari/i.test(userAgent)) return 'Safari browser';
  return 'Unknown browser';
}

/**
 * Issues a fresh access+refresh token pair for `user`, persists a hashed
 * record of the refresh token keyed by (user, deviceId), and sets both
 * cookies on the response. Returns the access token to send in the JSON
 * body (the refresh token itself never leaves the httpOnly cookie).
 */
async function issueSession(user, req, res) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const deviceId = req.cookies.deviceId || crypto.randomBytes(16).toString('hex');
  const tokenHash = RefreshToken.hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE);

  await RefreshToken.findOneAndUpdate(
    { user: user._id, deviceId },
    {
      user: user._id,
      deviceId,
      tokenHash,
      expiresAt,
      deviceLabel: shortDeviceLabel(req.headers['user-agent']),
    },
    { upsert: true, new: true }
  );

  // deviceId is not secret - it's just a stable label for "this browser".
  // It does NOT need to be httpOnly.
  res.cookie('deviceId', deviceId, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  // refreshToken is the sensitive one - httpOnly so no JS (including an
  // XSS payload) can ever read it, scoped to only the auth routes that
  // need it.
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE,
  });

  return accessToken;
}

function clearAuthCookies(res) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('deviceId');
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const user = await User.create({ name, email, password, role });
  const accessToken = await issueSession(user, req, res);

  res.status(201).json({ user, accessToken });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    // Deliberately identical message for "no such user" and "wrong
    // password" so login can't be used to enumerate registered emails.
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const accessToken = await issueSession(user, req, res);
  res.status(200).json({ user, accessToken });
});

// POST /api/auth/refresh
// Called silently by the frontend's Axios interceptor whenever an access
// token expires. Rotates the refresh token on every use.
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  const deviceId = req.cookies.deviceId;

  if (!token || !deviceId) {
    return res.status(401).json({ message: 'No refresh token, please log in again' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Refresh token invalid or expired, please log in again' });
  }

  const record = await RefreshToken.findOne({ user: decoded.userId, deviceId });
  if (!record) {
    clearAuthCookies(res);
    return res.status(403).json({ message: 'Session not recognized, please log in again' });
  }

  const presentedHash = RefreshToken.hashToken(token);
  if (presentedHash !== record.tokenHash) {
    // The token presented doesn't match the last one we issued for this
    // device. That means it's an already-rotated-away token being
    // reused - a sign of theft. Response: kill every session this user
    // has, on every device, and make them log in fresh everywhere.
    await RefreshToken.deleteMany({ user: decoded.userId });
    clearAuthCookies(res);
    return res.status(403).json({
      message: 'Possible token reuse detected. All sessions were logged out for safety - please log in again.',
    });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'User no longer exists' });
  }

  const accessToken = await issueSession(user, req, res); // rotates the stored hash
  res.status(200).json({ user, accessToken });
});

// POST /api/auth/logout - logs out the current device only.
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  const deviceId = req.cookies.deviceId;

  if (token && deviceId) {
    try {
      const decoded = verifyRefreshToken(token);
      await RefreshToken.deleteOne({ user: decoded.userId, deviceId });
    } catch (err) {
      // Token already invalid/expired - nothing to clean up server-side.
    }
  }

  clearAuthCookies(res);
  res.status(200).json({ message: 'Logged out' });
});

// GET /api/auth/sessions - list this user's active devices (protect'd)
const listSessions = asyncHandler(async (req, res) => {
  const sessions = await RefreshToken.find({ user: req.userId }).select(
    'deviceId deviceLabel createdAt expiresAt'
  );

  const currentDeviceId = req.cookies.deviceId;
  res.status(200).json(
    sessions.map((s) => ({
      deviceId: s.deviceId,
      deviceLabel: s.deviceLabel,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrentDevice: s.deviceId === currentDeviceId,
    }))
  );
});

// DELETE /api/auth/sessions/:deviceId - force-logout one specific device
// (Q26: user logged in on two devices, force logout one).
const revokeSession = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const result = await RefreshToken.deleteOne({ user: req.userId, deviceId });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: 'Session not found' });
  }

  res.status(200).json({ message: 'Session revoked - that device will be signed out' });
});

// GET /api/auth/me - return the current user (protect'd)
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  listSessions,
  revokeSession,
  getMe,
};
