const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { loginLimiter, registerLimiter, refreshLimiter } = require('../middleware/rateLimiters');
const {
  register,
  login,
  refresh,
  logout,
  listSessions,
  revokeSession,
  getMe,
} = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['teacher', 'student']).withMessage("Role must be 'teacher' or 'student'"),
  ],
  validate,
  register
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

router.get('/me', protect, getMe);
router.get('/sessions', protect, listSessions);
router.delete('/sessions/:deviceId', protect, revokeSession);

module.exports = router;
