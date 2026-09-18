const mongoose = require('mongoose');
const crypto = require('crypto');

// We never store the raw refresh token - only a SHA-256 hash of it.
// If the DB were ever read by an attacker, they still couldn't present
// a valid refresh token, because they'd need the original random value.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    // One record per device/browser, so a specific device can be logged
    // out (Q26) without affecting the user's other active sessions.
    deviceId: {
      type: String,
      required: true,
    },
    deviceLabel: {
      type: String,
      default: 'Unknown device',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// A user can only have one active refresh-token record per device -
// rotation replaces it rather than piling up rows.
refreshTokenSchema.index({ user: 1, deviceId: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-cleanup

refreshTokenSchema.statics.hashToken = hashToken;

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
