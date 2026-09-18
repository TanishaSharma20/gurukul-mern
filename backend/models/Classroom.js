const mongoose = require('mongoose');

// Each entry in `students` represents one student's relationship to this
// classroom: a join request that is pending, approved, or rejected.
// Keeping status here (not just in the JWT) is what lets the backend
// re-check access on every request instead of trusting a stale token.
const studentStatusSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
  },
  { _id: false }
);

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Classroom name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    students: [studentStatusSchema],
  },
  { timestamps: true }
);

// Fast lookup of "does this student have approved access to this classroom"
classroomSchema.index({ 'students.student': 1 });

module.exports = mongoose.model('Classroom', classroomSchema);
