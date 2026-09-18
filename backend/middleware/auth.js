const { verifyAccessToken } = require('../utils/generateTokens');
const User = require('../models/User');

/**
 * protect - middleware #1 in the auth chain.
 * Checks that a valid access token was sent in the Authorization header.
 * On success, attaches `req.userId` and `req.userRole` for downstream
 * middleware/controllers to use. Returns 401 if the token is missing,
 * malformed, or expired.
 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      // Covers both "invalid signature" and "expired" - the frontend's
      // Axios interceptor is what turns this 401 into a silent refresh.
      return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
    }

    // Confirm the user still exists (e.g. wasn't deleted after the token
    // was issued) before letting the request through.
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    req.userId = user._id.toString();
    req.userRole = user.role;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * authorize - middleware #2 in the auth chain, used after `protect`.
 * Restricts a route to one or more roles. Returns 403 (not 401 - the
 * user IS authenticated, they just don't have permission) when the
 * role doesn't match.
 *
 * Usage: router.post('/classrooms', protect, authorize('teacher'), ...)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        message: `Forbidden: requires role ${allowedRoles.join(' or ')}`,
      });
    }
    next();
  };
}

module.exports = { protect, authorize };
