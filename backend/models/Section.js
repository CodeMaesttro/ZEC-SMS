const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Section name is required'],
    trim: true,
    maxlength: [10, 'Section name cannot exceed 10 characters']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  sectionTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  capacity: {
    type: Number,
    default: 40,
    min: [1, 'Capacity must be at least 1']
  },
  room: {
    type: String,
    trim: true,
    maxlength: [20, 'Room cannot exceed 20 characters']
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

// Virtual for students count
sectionSchema.virtual('studentsCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'section',
  count: true
});

// Compound index for unique section per class
sectionSchema.index({ name: 1, class: 1 }, { unique: true });
sectionSchema.index({ class: 1 });
sectionSchema.index({ isActive: 1 });

// Pre-remove middleware to handle cascading deletes
sectionSchema.pre('remove', async function(next) {
  try {
    // Update students to remove section reference
    await mongoose.model('Student').updateMany(
      { section: this._id },
      { $unset: { section: 1 } }
    );
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Section', sectionSchema);