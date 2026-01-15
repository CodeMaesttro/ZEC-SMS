const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [50, 'Class name cannot exceed 50 characters']
  },
  grade: {
    type: Number,
    required: [true, 'Grade is required'],
    min: [1, 'Grade must be at least 1'],
    max: [12, 'Grade cannot exceed 12']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  capacity: {
    type: Number,
    default: 50,
    min: [1, 'Capacity must be at least 1']
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for sections
classSchema.virtual('sections', {
  ref: 'Section',
  localField: '_id',
  foreignField: 'class'
});

// Virtual for students count
classSchema.virtual('studentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'class',
  count: true
});

// Compound index for unique class per session
classSchema.index({ name: 1, session: 1 }, { unique: true });
classSchema.index({ grade: 1, session: 1 });
classSchema.index({ isActive: 1 });

// Pre-remove middleware to handle cascading deletes
classSchema.pre('remove', async function(next) {
  try {
    // Remove all sections of this class
    await mongoose.model('Section').deleteMany({ class: this._id });
    
    // Update students to remove class reference
    await mongoose.model('Student').updateMany(
      { class: this._id },
      { $unset: { class: 1, section: 1 } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Class', classSchema);