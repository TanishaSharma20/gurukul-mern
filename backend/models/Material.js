const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    // Kept as a link/text-content field so the demo doesn't depend on file
    // storage infra. Swap for an S3/Cloudinary URL in a real deployment.
    resourceUrl: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
