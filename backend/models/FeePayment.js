const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
  },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
    required: [true, 'Fee structure is required']
  },
  feeType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeType',
    required: [true, 'Fee type is required']
  },
  month: {
    type: Number,
    min: [1, 'Month must be between 1 and 12'],
    max: [12, 'Month must be between 1 and 12']
  },
  year: {
    type: Number,
    required: [true, 'Year is required']
  },
  dueAmount: {
    type: Number,
    required: [true, 'Due amount is required'],
    min: [0, 'Due amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    required: [true, 'Paid amount is required'],
    min: [0, 'Paid amount cannot be negative']
  },
  lateFee: {
    type: Number,
    default: 0,
    min: [0, 'Late fee cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'Online', 'Card'],
    required: [true, 'Payment method is required']
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: [100, 'Transaction ID cannot exceed 100 characters']
  },
  receiptNumber: {
    type: String,
    unique: true,
    trim: true,
    maxlength: [50, 'Receipt number cannot exceed 50 characters']
  },
  status: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending', 'Overdue', 'Cancelled'],
    default: 'Paid'
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Collected by is required']
  },
  collectedAt: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modifiedAt: {
    type: Date
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining amount
feePaymentSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.dueAmount - this.paidAmount);
});

// Virtual for payment status based on amounts
feePaymentSchema.virtual('paymentStatus').get(function() {
  if (this.paidAmount >= this.dueAmount) {
    return 'Paid';
  } else if (this.paidAmount > 0) {
    return 'Partial';
  } else if (this.dueDate && new Date() > this.dueDate) {
    return 'Overdue';
  } else {
    return 'Pending';
  }
});

// Pre-save middleware to generate receipt number
feePaymentSchema.pre('save', async function(next) {
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find the last receipt number for this month
    const lastPayment = await this.constructor
      .findOne({ 
        receiptNumber: new RegExp(`^RCP${year}${month}`) 
      })
      .sort({ receiptNumber: -1 });
    
    let nextNumber = 1;
    if (lastPayment) {
      const lastNumber = parseInt(lastPayment.receiptNumber.slice(-4));
      nextNumber = lastNumber + 1;
    }
    
    this.receiptNumber = `RCP${year}${month}${nextNumber.toString().padStart(4, '0')}`;
  }
  
  // Calculate total amount
  this.totalAmount = this.paidAmount + this.lateFee - this.discount;
  
  // Update status based on payment
  if (this.paidAmount >= this.dueAmount) {
    this.status = 'Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partial';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.status = 'Overdue';
  } else {
    this.status = 'Pending';
  }
  
  next();
});

// Indexes
feePaymentSchema.index({ student: 1, feeType: 1, month: 1, year: 1, session: 1 });
feePaymentSchema.index({ receiptNumber: 1 }, { unique: true });
feePaymentSchema.index({ paymentDate: 1 });
feePaymentSchema.index({ status: 1 });
feePaymentSchema.index({ session: 1 });

// Static method to get student fee history
feePaymentSchema.statics.getStudentFeeHistory = function(studentId, sessionId) {
  return this.find({
    student: studentId,
    session: sessionId
  })
  .populate('feeType', 'name category')
  .populate('feeStructure', 'amount')
  .sort({ paymentDate: -1 });
};

// Static method to get monthly collection report
feePaymentSchema.statics.getMonthlyCollection = async function(month, year, sessionId) {
  return await this.aggregate([
    {
      $match: {
        month: month,
        year: year,
        session: mongoose.Types.ObjectId(sessionId),
        status: { $in: ['Paid', 'Partial'] }
      }
    },
    {
      $lookup: {
        from: 'feetypes',
        localField: 'feeType',
        foreignField: '_id',
        as: 'feeType'
      }
    },
    {
      $unwind: '$feeType'
    },
    {
      $group: {
        _id: '$feeType.category',
        totalCollection: { $sum: '$paidAmount' },
        totalLateFee: { $sum: '$lateFee' },
        totalDiscount: { $sum: '$discount' },
        paymentCount: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Static method to get outstanding fees
feePaymentSchema.statics.getOutstandingFees = function(classId, sessionId) {
  const query = {
    session: sessionId,
    status: { $in: ['Pending', 'Partial', 'Overdue'] }
  };
  
  return this.find(query)
    .populate({
      path: 'student',
      match: classId ? { class: classId } : {},
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    })
    .populate('feeType', 'name category')
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('FeePayment', feePaymentSchema);