const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    maxlength: [20, 'Employee ID cannot exceed 20 characters']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  qualification: {
    type: String,
    trim: true,
    maxlength: [200, 'Qualification cannot exceed 200 characters']
  },
  experience: {
    type: String,
    trim: true,
    maxlength: [100, 'Experience cannot exceed 100 characters']
  },
  specialization: {
    type: String,
    trim: true,
    maxlength: [200, 'Specialization cannot exceed 200 characters']
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required'],
    default: Date.now
  },
  salary: {
    basic: {
      type: Number,
      min: [0, 'Basic salary cannot be negative']
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative']
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative']
    }
  },
  assignedClasses: [{
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section'
    },
    isClassTeacher: {
      type: Boolean,
      default: false
    }
  }],
  assignedSubjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    classes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }]
  }],
  workingHours: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String }
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
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
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

// Virtual for total salary
teacherSchema.virtual('totalSalary').get(function() {
  const basic = this.salary?.basic || 0;
  const allowances = this.salary?.allowances || 0;
  const deductions = this.salary?.deductions || 0;
  return basic + allowances - deductions;
});

// Indexes
teacherSchema.index({ employeeId: 1 }, { unique: true });
teacherSchema.index({ department: 1 });
teacherSchema.index({ designation: 1 });
teacherSchema.index({ status: 1 });
teacherSchema.index({ session: 1 });

// Pre-save middleware to generate employee ID if not provided
teacherSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const session = await mongoose.model('Session').findById(this.session);
    const year = session ? session.name.split('-')[0] : new Date().getFullYear();
    
    // Find the last employee ID for this year
    const lastTeacher = await this.constructor
      .findOne({ employeeId: new RegExp(`^T${year}`) })
      .sort({ employeeId: -1 });
    
    let nextNumber = 1;
    if (lastTeacher) {
      const lastNumber = parseInt(lastTeacher.employeeId.slice(-3));
      nextNumber = lastNumber + 1;
    }
    
    this.employeeId = `T${year}${nextNumber.toString().padStart(3, '0')}`;
  }
  
  next();
});

// Method to assign class
teacherSchema.methods.assignClass = function(classId, sectionId = null, isClassTeacher = false) {
  const assignment = {
    class: classId,
    isClassTeacher
  };
  
  if (sectionId) {
    assignment.section = sectionId;
  }
  
  // Remove existing assignment for the same class/section
  this.assignedClasses = this.assignedClasses.filter(ac => 
    !(ac.class.toString() === classId.toString() && 
      (!sectionId || ac.section?.toString() === sectionId.toString()))
  );
  
  this.assignedClasses.push(assignment);
  return this.save();
};

// Method to assign subject
teacherSchema.methods.assignSubject = function(subjectId, classIds = []) {
  // Remove existing assignment for the same subject
  this.assignedSubjects = this.assignedSubjects.filter(as => 
    as.subject.toString() !== subjectId.toString()
  );
  
  this.assignedSubjects.push({
    subject: subjectId,
    classes: classIds
  });
  
  return this.save();
};

// Static method to get teachers by subject
teacherSchema.statics.getBySubject = function(subjectId) {
  return this.find({
    'assignedSubjects.subject': subjectId,
    status: 'Active'
  })
  .populate('user', 'firstName lastName email phone profileImage')
  .populate('assignedSubjects.subject', 'name code')
  .populate('assignedSubjects.classes', 'name grade');
};

module.exports = mongoose.model('Teacher', teacherSchema);