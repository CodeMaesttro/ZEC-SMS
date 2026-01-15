const mongoose = require('mongoose');

const examTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exam type name is required'],
    trim: true,
    maxlength: [100, 'Exam type name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  totalMarks: {
    type: Number,
    default: 100,
    min: [1, 'Total marks must be at least 1']
  },
  passingMarks: {
    type: Number,
    default: 40,
    min: [1, 'Passing marks must be at least 1']
  },
  duration: {
    type: Number, // in minutes
    min: [1, 'Duration must be at least 1 minute']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Validate passing marks is less than total marks
examTypeSchema.pre('save', function(next) {
  if (this.passingMarks >= this.totalMarks) {
    next(new Error('Passing marks must be less than total marks'));
  }
  next();
});

// Compound index for unique exam type per session
examTypeSchema.index({ name: 1, session: 1 }, { unique: true });
examTypeSchema.index({ isActive: 1 });

module.exports = mongoose.model('ExamType', examTypeSchema);