const mongoose = require('mongoose');

const feeTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Fee type name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  code: {
    type: String,
    required: [true, 'Fee type code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  category: {
    type: String,
    enum: ['Academic', 'Administrative', 'Transport', 'Hostel', 'Library', 'Laboratory', 'Sports', 'Other'],
    default: 'Academic'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'],
    default: 'One-Time'
  },
  isOptional: {
    type: Boolean,
    default: false
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

// Indexes
feeTypeSchema.index({ code: 1, session: 1 }, { unique: true });
feeTypeSchema.index({ name: 1 });
feeTypeSchema.index({ category: 1 });
feeTypeSchema.index({ isActive: 1 });
feeTypeSchema.index({ session: 1 });

// Static method to get active fee types
feeTypeSchema.statics.getActive = function(sessionId) {
  return this.find({
    isActive: true,
    session: sessionId
  }).sort({ name: 1 });
};

// Static method to get by category
feeTypeSchema.statics.getByCategory = function(category, sessionId) {
  return this.find({
    category,
    session: sessionId,
    isActive: true
  }).sort({ name: 1 });
};

module.exports = mongoose.model('FeeType', feeTypeSchema);