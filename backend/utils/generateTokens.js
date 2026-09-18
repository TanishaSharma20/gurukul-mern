const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Access token: short-lived, carries userId + role, sent in the
// Authorization header on every request, kept in the frontend's
// in-memory/localStorage state.
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

// Refresh token: long-lived opaque-ish JWT, sent ONLY inside an httpOnly
// cookie so client-side JavaScript (and therefore XSS) can never read it.
// Its raw value is hashed before being stored in the DB (see RefreshToken
// model), and it carries a random jti so two tokens for the same user
// never collide or get confused with each other.
function generateRefreshToken(user) {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    { userId: user._id.toString(), jti },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return token;
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Converts "7d" / "15m" style strings into a millisecond duration so we
// can compute an explicit expiresAt for the RefreshToken DB record and
// for the cookie's maxAge.
function parseDurationToMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(String(duration).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default: 7 days
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * unitMs[unit];
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  parseDurationToMs,
};
