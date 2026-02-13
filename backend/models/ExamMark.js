const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required']
  },
  examType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamType',
    required: [true, 'Exam type is required']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
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
  marksObtained: {
    type: Number,
    required: [true, 'Marks obtained is required'],
    min: [0, 'Marks cannot be negative']
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
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'],
    required: [true, 'Grade is required']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  isPassed: {
    type: Boolean,
    required: true
  },
  isAbsent: {
    type: Boolean,
    default: false
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Entered by is required']
  },
  enteredAt: {
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
  timestamps: true
});

// Validate marks obtained is not greater than total marks
examMarkSchema.pre('save', function(next) {
  if (this.marksObtained > this.totalMarks) {
    next(new Error('Marks obtained cannot be greater than total marks'));
  }
  next();
});

// Calculate percentage, grade, and pass status before saving
examMarkSchema.pre('save', function(next) {
  if (this.isAbsent) {
    this.marksObtained = 0;
    this.percentage = 0;
    this.grade = 'F';
    this.isPassed = false;
  } else {
    // Calculate percentage
    this.percentage = Math.round((this.marksObtained / this.totalMarks) * 100);
    
    // Determine pass/fail
    this.isPassed = this.marksObtained >= this.passingMarks;
    
    // Calculate grade
    this.grade = calculateGrade(this.percentage);
  }
  
  next();
});

// Function to calculate grade based on percentage
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 35) return 'D+';
  if (percentage >= 30) return 'D';
  return 'F';
}

// Compound index for unique mark per student per exam
examMarkSchema.index({ student: 1, exam: 1 }, { unique: true });
examMarkSchema.index({ student: 1, examType: 1, subject: 1, session: 1 });
examMarkSchema.index({ class: 1, section: 1, examType: 1, session: 1 });
examMarkSchema.index({ subject: 1, examType: 1, session: 1 });

// Static method to get marks by student and exam type
examMarkSchema.statics.getByStudentAndExamType = function(studentId, examTypeId, sessionId) {
  return this.find({
    student: studentId,
    examType: examTypeId,
    session: sessionId
  })
  .populate('subject', 'name code totalMarks')
  .populate('exam', 'name date')
  .sort({ 'subject.name': 1 });
};

// Static method to get class results for an exam type
examMarkSchema.statics.getClassResults = function(classId, sectionId, examTypeId, sessionId) {
  const query = {
    class: classId,
    examType: examTypeId,
    session: sessionId
  };
  
  if (sectionId) {
    query.section = sectionId;
  }
  
  return this.find(query)
    .populate('student', 'studentId rollNumber')
    .populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    })
    .populate('subject', 'name code')
    .sort({ 'student.rollNumber': 1, 'subject.name': 1 });
};

// Static method to calculate student's overall performance
examMarkSchema.statics.getStudentOverallPerformance = async function(studentId, sessionId) {
  const results = await this.aggregate([
    {
      $match: {
        student: mongoose.Types.ObjectId(studentId),
        session: mongoose.Types.ObjectId(sessionId)
      }
    },
    {
      $group: {
        _id: '$examType',
        totalMarks: { $sum: '$totalMarks' },
        marksObtained: { $sum: '$marksObtained' },
        subjectsCount: { $sum: 1 },
        passedSubjects: {
          $sum: {
            $cond: ['$isPassed', 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'examtypes',
        localField: '_id',
        foreignField: '_id',
        as: 'examType'
      }
    },
    {
      $unwind: '$examType'
    },
    {
      $project: {
        examTypeName: '$examType.name',
        totalMarks: 1,
        marksObtained: 1,
        percentage: {
          $round: [
            { $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] },
            2
          ]
        },
        subjectsCount: 1,
        passedSubjects: 1,
        grade: {
          $switch: {
            branches: [
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 90] }, then: 'A+' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 80] }, then: 'A' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 70] }, then: 'B+' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 60] }, then: 'B' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 50] }, then: 'C+' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 40] }, then: 'C' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 35] }, then: 'D+' },
              { case: { $gte: [{ $multiply: [{ $divide: ['$marksObtained', '$totalMarks'] }, 100] }, 30] }, then: 'D' }
            ],
            default: 'F'
          }
        }
      }
    }
  ]);
  
  return results;
};

module.exports = mongoose.model('ExamMark', examMarkSchema);
