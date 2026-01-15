const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true,
    maxlength: [100, 'Exam name cannot exceed 100 characters']
  },
  examType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamType',
    required: [true, 'Exam type is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [1, 'Total marks must be at least 1']
  },
  passingMarks: {
    type: Number,
    required: [true, 'Passing marks is required'],
    min: [1, 'Passing marks must be at least 1']
  },
  room: {
    type: String,
    trim: true,
    maxlength: [50, 'Room cannot exceed 50 characters']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Scheduled'
  },
  isPublished: {
    type: Boolean,
    default: false
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for exam marks
examSchema.virtual('examMarks', {
  ref: 'ExamMark',
  localField: '_id',
  foreignField: 'exam'
});

// Validate passing marks is less than total marks
examSchema.pre('save', function(next) {
  if (this.passingMarks >= this.totalMarks) {
    next(new Error('Passing marks must be less than total marks'));
  }
  next();
});

// Validate end time is after start time
examSchema.pre('save', function(next) {
  const startMinutes = this.startTime.split(':').reduce((acc, time) => (60 * acc) + +time);
  const endMinutes = this.endTime.split(':').reduce((acc, time) => (60 * acc) + +time);
  
  if (endMinutes <= startMinutes) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Indexes
examSchema.index({ class: 1, section: 1, date: 1 });
examSchema.index({ subject: 1, date: 1 });
examSchema.index({ teacher: 1, date: 1 });
examSchema.index({ status: 1 });
examSchema.index({ session: 1 });

// Static method to get exams by class and date range
examSchema.statics.getByClassAndDateRange = function(classId, sectionId, startDate, endDate) {
  const query = {
    class: classId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (sectionId) {
    query.section = sectionId;
  }
  
  return this.find(query)
    .populate('examType', 'name totalMarks passingMarks')
    .populate('subject', 'name code')
    .populate('teacher', 'firstName lastName')
    .sort({ date: 1, startTime: 1 });
};

module.exports = mongoose.model('Exam', examSchema);