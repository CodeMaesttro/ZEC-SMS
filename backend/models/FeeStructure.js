const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  feeType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeType',
    required: [true, 'Fee type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  dueDate: {
    type: Date
  },
  lateFee: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Late fee cannot be negative']
    },
    afterDays: {
      type: Number,
      default: 0,
      min: [0, 'After days cannot be negative']
    }
  },
  discount: {
    type: {
      type: String,
      enum: ['Percentage', 'Fixed'],
      default: 'Fixed'
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'Discount value cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Discount description cannot exceed 200 characters']
    }
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

// Virtual for net amount after discount
feeStructureSchema.virtual('netAmount').get(function() {
  let netAmount = this.amount;
  
  if (this.discount.value > 0) {
    if (this.discount.type === 'Percentage') {
      netAmount = this.amount - (this.amount * this.discount.value / 100);
    } else {
      netAmount = this.amount - this.discount.value;
    }
  }
  
  return Math.max(0, netAmount);
});

// Compound index for unique fee structure per class and fee type
feeStructureSchema.index({ class: 1, feeType: 1, session: 1 }, { unique: true });
feeStructureSchema.index({ class: 1, session: 1 });
feeStructureSchema.index({ feeType: 1, session: 1 });
feeStructureSchema.index({ isActive: 1 });

// Validate discount percentage
feeStructureSchema.pre('save', function(next) {
  if (this.discount.type === 'Percentage' && this.discount.value > 100) {
    next(new Error('Discount percentage cannot exceed 100%'));
  }
  
  if (this.discount.type === 'Fixed' && this.discount.value > this.amount) {
    next(new Error('Fixed discount cannot exceed the fee amount'));
  }
  
  next();
});

// Static method to get fee structure by class
feeStructureSchema.statics.getByClass = function(classId, sessionId) {
  return this.find({
    class: classId,
    session: sessionId,
    isActive: true
  })
  .populate('feeType', 'name category frequency')
  .sort({ 'feeType.category': 1, 'feeType.name': 1 });
};

module.exports = mongoose.model('FeeStructure', feeStructureSchema);