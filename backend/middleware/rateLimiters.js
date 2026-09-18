const rateLimit = require('express-rate-limit');

// Slows down brute-force login/credential-stuffing attempts without
// affecting normal usage - 20 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});

// Registration doesn't need to be as strict but still shouldn't be
// scriptable at unlimited speed.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this IP. Please try again later.' },
});

// The refresh endpoint is hit automatically by the frontend, so the
// limit is generous, but it still caps runaway refresh-loops or a
// script hammering the endpoint with stolen/guessed cookies.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many refresh attempts. Please log in again.' },
});

module.exports = { loginLimiter, registerLimiter, refreshLimiter };
