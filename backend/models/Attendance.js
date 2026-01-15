const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
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
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Excused'],
    required: [true, 'Attendance status is required']
  },
  timeIn: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  timeOut: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Marked by is required']
  },
  markedAt: {
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

// Compound index for unique attendance per student per date
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ class: 1, section: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ session: 1 });

// Pre-save middleware to set modification fields
attendanceSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.modifiedAt = new Date();
  }
  next();
});

// Static method to get attendance by class and date range
attendanceSchema.statics.getByClassAndDateRange = function(classId, sectionId, startDate, endDate) {
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
    .populate('student', 'studentId rollNumber')
    .populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName'
      }
    })
    .sort({ date: -1, 'student.rollNumber': 1 });
};

// Static method to get student attendance summary
attendanceSchema.statics.getStudentSummary = async function(studentId, startDate, endDate, sessionId) {
  const query = {
    student: studentId,
    session: sessionId
  };
  
  if (startDate && endDate) {
    query.date = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  const summary = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalDays = await this.countDocuments(query);
  
  const result = {
    totalDays,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercentage: 0
  };
  
  summary.forEach(item => {
    result[item._id.toLowerCase()] = item.count;
  });
  
  if (totalDays > 0) {
    result.attendancePercentage = Math.round((result.present / totalDays) * 100);
  }
  
  return result;
};

// Static method to get class attendance summary for a date
attendanceSchema.statics.getClassSummaryByDate = async function(classId, sectionId, date, sessionId) {
  const query = {
    class: classId,
    date: date,
    session: sessionId
  };
  
  if (sectionId) {
    query.section = sectionId;
  }
  
  const summary = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const totalStudents = await this.countDocuments(query);
  
  const result = {
    totalStudents,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercentage: 0
  };
  
  summary.forEach(item => {
    result[item._id.toLowerCase()] = item.count;
  });
  
  if (totalStudents > 0) {
    result.attendancePercentage = Math.round((result.present / totalStudents) * 100);
  }
  
  return result;
};

// Static method to mark bulk attendance
attendanceSchema.statics.markBulkAttendance = async function(attendanceData, markedBy, sessionId) {
  const operations = attendanceData.map(data => ({
    updateOne: {
      filter: {
        student: data.studentId,
        date: data.date,
        session: sessionId
      },
      update: {
        $set: {
          class: data.classId,
          section: data.sectionId,
          status: data.status,
          timeIn: data.timeIn,
          timeOut: data.timeOut,
          remarks: data.remarks,
          markedBy: markedBy,
          markedAt: new Date(),
          modifiedBy: markedBy,
          modifiedAt: new Date()
        }
      },
      upsert: true
    }
  }));
  
  return await this.bulkWrite(operations);
};

module.exports = mongoose.model('Attendance', attendanceSchema);