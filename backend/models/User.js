const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema = the blueprint (fields, types, validation rules).
// The Model built from it (below, via mongoose.model) is the tool used
// to actually create/read/update/delete documents in MongoDB.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned by default on find()
    },
    role: {
      type: String,
      enum: ['teacher', 'student'],
      required: true,
      default: 'student',
    },
  },
  { timestamps: true }
);

// Hash the password before saving, but only if it changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method used at login to check the plaintext password
// against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak the password hash if a User document is ever serialized.
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
