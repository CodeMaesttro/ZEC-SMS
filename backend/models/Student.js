const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    maxlength: [20, 'Student ID cannot exceed 20 characters']
  },
  rollNumber: {
    type: String,
    trim: true,
    maxlength: [10, 'Roll number cannot exceed 10 characters']
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
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  admissionDate: {
    type: Date,
    required: [true, 'Admission date is required'],
    default: Date.now
  },
  admissionNumber: {
    type: String,
    unique: true,
    trim: true,
    maxlength: [20, 'Admission number cannot exceed 20 characters']
  },
  previousSchool: {
    type: String,
    trim: true,
    maxlength: [100, 'Previous school name cannot exceed 100 characters']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  medicalConditions: {
    type: String,
    trim: true,
    maxlength: [500, 'Medical conditions cannot exceed 500 characters']
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [15, 'Emergency contact phone cannot exceed 15 characters']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    }
  },
  transport: {
    required: {
      type: Boolean,
      default: false
    },
    route: {
      type: String,
      trim: true,
      maxlength: [100, 'Transport route cannot exceed 100 characters']
    },
    pickupPoint: {
      type: String,
      trim: true,
      maxlength: [200, 'Pickup point cannot exceed 200 characters']
    }
  },
  hostel: {
    required: {
      type: Boolean,
      default: false
    },
    roomNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Room number cannot exceed 20 characters']
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Graduated', 'Transferred', 'Dropped'],
    default: 'Active'
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

// Virtual for attendance records
studentSchema.virtual('attendanceRecords', {
  ref: 'Attendance',
  localField: '_id',
  foreignField: 'student'
});

// Virtual for exam marks
studentSchema.virtual('examMarks', {
  ref: 'ExamMark',
  localField: '_id',
  foreignField: 'student'
});

// Virtual for fee payments
studentSchema.virtual('feePayments', {
  ref: 'FeePayment',
  localField: '_id',
  foreignField: 'student'
});

// Ensure unique roll number per class and section
studentSchema.index({ rollNumber: 1, class: 1, section: 1 }, { 
  unique: true,
  partialFilterExpression: { rollNumber: { $exists: true, $ne: null } }
});

// Other indexes
studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ admissionNumber: 1 }, { unique: true });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ parent: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ session: 1 });

// Pre-save middleware to generate student ID if not provided
studentSchema.pre('save', async function(next) {
  if (!this.studentId) {
    const session = await mongoose.model('Session').findById(this.session);
    const year = session ? session.name.split('-')[0] : new Date().getFullYear();
    
    // Find the last student ID for this year
    const lastStudent = await this.constructor
      .findOne({ studentId: new RegExp(`^${year}`) })
      .sort({ studentId: -1 });
    
    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentId.slice(-4));
      nextNumber = lastNumber + 1;
    }
    
    this.studentId = `${year}${nextNumber.toString().padStart(4, '0')}`;
  }
  
  if (!this.admissionNumber) {
    this.admissionNumber = this.studentId;
  }
  
  next();
});

// Static method to get students by class and section
studentSchema.statics.getByClassSection = function(classId, sectionId = null) {
  const query = { class: classId, status: 'Active' };
  if (sectionId) {
    query.section = sectionId;
  }
  
  return this.find(query)
    .populate('user', 'firstName lastName email phone profileImage')
    .populate('class', 'name grade')
    .populate('section', 'name')
    .populate('parent', 'firstName lastName email phone')
    .sort({ rollNumber: 1 });
};

module.exports = mongoose.model('Student', studentSchema);