const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true,
    maxlength: [10, 'Subject code cannot exceed 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['Core', 'Elective', 'Optional'],
    default: 'Core'
  },
  credits: {
    type: Number,
    default: 1,
    min: [0.5, 'Credits must be at least 0.5'],
    max: [10, 'Credits cannot exceed 10']
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
subjectSchema.pre('save', function(next) {
  if (this.passingMarks >= this.totalMarks) {
    next(new Error('Passing marks must be less than total marks'));
  }
  next();
});

// Compound index for unique subject code per session
subjectSchema.index({ code: 1, session: 1 }, { unique: true });
subjectSchema.index({ name: 1 });
subjectSchema.index({ teacher: 1 });
subjectSchema.index({ isActive: 1 });

module.exports = mongoose.model('Subject', subjectSchema);