const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const ExamMark = require('../models/ExamMark');
const FeePayment = require('../models/FeePayment');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

// @desc    Get student report
// @route   GET /api/reports/student/:studentId
// @access  Private (Admin, Teacher, Student-own, Parent-own)
const getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { session, startDate, endDate } = req.query;

    // Check permissions
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own report.'
        });
      }
    } else if (req.user.role === 'Parent') {
      const student = await Student.findOne({ _id: studentId, parent: req.user._id });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your child\'s report.'
        });
      }
    }

    // Get student details
    const student = await Student.findById(studentId)
      .populate('user', 'firstName lastName email')
      .populate('class', 'name grade')
      .populate('parent', 'firstName lastName email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Date range for reports
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get attendance summary
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get exam results
    const examResults = await ExamMark.find({
      student: studentId,
      ...dateFilter
    })
    .populate('exam', 'name type date')
    .populate('subject', 'name code')
    .sort({ 'exam.date': -1 });

    // Get fee payment status
    const feePayments = await FeePayment.find({
      student: studentId,
      ...dateFilter
    })
    .populate('feeType', 'name')
    .sort({ paymentDate: -1 });

    // Calculate attendance percentage
    const totalAttendance = attendanceStats.reduce((sum, stat) => sum + stat.count, 0);
    const presentDays = attendanceStats.find(stat => stat._id === 'Present')?.count || 0;
    const attendancePercentage = totalAttendance > 0 ? (presentDays / totalAttendance) * 100 : 0;

    // Calculate average marks
    const totalMarks = examResults.reduce((sum, result) => sum + result.marksObtained, 0);
    const totalMaxMarks = examResults.reduce((sum, result) => sum + result.maxMarks, 0);
    const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    const report = {
      student,
      summary: {
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        totalClasses: totalAttendance,
        presentDays,
        absentDays: attendanceStats.find(stat => stat._id === 'Absent')?.count || 0,
        averageMarks: Math.round(averagePercentage * 100) / 100,
        totalExams: examResults.length,
        totalFeesPaid: feePayments.reduce((sum, payment) => sum + payment.totalAmount, 0)
      },
      attendanceStats,
      examResults,
      feePayments
    };

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('Get student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating student report'
    });
  }
};

// @desc    Get class report
// @route   GET /api/reports/class/:classId
// @access  Private (Admin, Teacher)
const getClassReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const { session, startDate, endDate } = req.query;

    // Get class details
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Date range for reports
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get students in class
    const students = await Student.find({ class: classId })
      .populate('user', 'firstName lastName')
      .select('admissionNumber rollNumber user');

    // Get class attendance summary
    const attendanceStats = await Attendance.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $match: {
          'studentInfo.class': new mongoose.Types.ObjectId(classId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get class exam performance
    const examPerformance = await ExamMark.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $match: {
          'studentInfo.class': new mongoose.Types.ObjectId(classId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$subject',
          averageMarks: { $avg: '$marksObtained' },
          maxMarks: { $first: '$maxMarks' },
          totalStudents: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      }
    ]);

    // Get fee collection summary
    const feeCollection = await FeePayment.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $match: {
          'studentInfo.class': new mongoose.Types.ObjectId(classId),
          status: 'Paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$feeType',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'feetypes',
          localField: '_id',
          foreignField: '_id',
          as: 'feeTypeInfo'
        }
      }
    ]);

    const report = {
      class: classInfo,
      summary: {
        totalStudents: students.length,
        attendanceStats,
        examPerformance,
        feeCollection
      },
      students
    };

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('Get class report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating class report'
    });
  }
};

// @desc    Get attendance report
// @route   GET /api/reports/attendance
// @access  Private (Admin, Teacher)
const getAttendanceReport = async (req, res) => {
  try {
    const { classId, startDate, endDate, studentId } = req.query;

    let matchQuery = {};

    if (classId) {
      const students = await Student.find({ class: classId }).select('_id');
      matchQuery.student = { $in: students.map(s => s._id) };
    }

    if (studentId) {
      matchQuery.student = new mongoose.Types.ObjectId(studentId);
    }

    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendanceReport = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentInfo.user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'studentInfo.class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $group: {
          _id: {
            student: '$student',
            studentName: { $arrayElemAt: ['$userInfo.firstName', 0] },
            lastName: { $arrayElemAt: ['$userInfo.lastName', 0] },
            className: { $arrayElemAt: ['$classInfo.name', 0] },
            admissionNumber: { $arrayElemAt: ['$studentInfo.admissionNumber', 0] }
          },
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentDays', '$totalDays'] },
              100
            ]
          }
        }
      },
      { $sort: { '_id.className': 1, '_id.studentName': 1 } }
    ]);

    res.json({
      success: true,
      data: { attendanceReport }
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating attendance report'
    });
  }
};

// @desc    Get exam report
// @route   GET /api/reports/exam/:examId
// @access  Private (Admin, Teacher)
const getExamReport = async (req, res) => {
  try {
    const { examId } = req.params;

    const examReport = await ExamMark.aggregate([
      { $match: { exam: new mongoose.Types.ObjectId(examId) } },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentInfo.user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'exam',
          foreignField: '_id',
          as: 'examInfo'
        }
      },
      {
        $group: {
          _id: '$student',
          studentName: { $first: { $arrayElemAt: ['$userInfo.firstName', 0] } },
          lastName: { $first: { $arrayElemAt: ['$userInfo.lastName', 0] } },
          admissionNumber: { $first: { $arrayElemAt: ['$studentInfo.admissionNumber', 0] } },
          examName: { $first: { $arrayElemAt: ['$examInfo.name', 0] } },
          subjects: {
            $push: {
              subject: { $arrayElemAt: ['$subjectInfo.name', 0] },
              marksObtained: '$marksObtained',
              maxMarks: '$maxMarks',
              percentage: {
                $multiply: [
                  { $divide: ['$marksObtained', '$maxMarks'] },
                  100
                ]
              }
            }
          },
          totalMarks: { $sum: '$marksObtained' },
          totalMaxMarks: { $sum: '$maxMarks' }
        }
      },
      {
        $addFields: {
          overallPercentage: {
            $multiply: [
              { $divide: ['$totalMarks', '$totalMaxMarks'] },
              100
            ]
          }
        }
      },
      { $sort: { overallPercentage: -1 } }
    ]);

    res.json({
      success: true,
      data: { examReport }
    });
  } catch (error) {
    console.error('Get exam report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating exam report'
    });
  }
};

// @desc    Get fee report
// @route   GET /api/reports/fees
// @access  Private (Admin)
const getFeeReport = async (req, res) => {
  try {
    const { classId, startDate, endDate, status } = req.query;

    let matchQuery = { status: 'Paid' };

    if (status) {
      matchQuery.status = status;
    }

    if (startDate && endDate) {
      matchQuery.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const feeReport = await FeePayment.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentInfo.user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'studentInfo.class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $lookup: {
          from: 'feetypes',
          localField: 'feeType',
          foreignField: '_id',
          as: 'feeTypeInfo'
        }
      },
      ...(classId ? [{
        $match: {
          'studentInfo.class': new mongoose.Types.ObjectId(classId)
        }
      }] : []),
      {
        $group: {
          _id: {
            class: '$studentInfo.class',
            className: { $arrayElemAt: ['$classInfo.name', 0] },
            feeType: '$feeType',
            feeTypeName: { $arrayElemAt: ['$feeTypeInfo.name', 0] }
          },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          payments: {
            $push: {
              student: {
                name: {
                  $concat: [
                    { $arrayElemAt: ['$userInfo.firstName', 0] },
                    ' ',
                    { $arrayElemAt: ['$userInfo.lastName', 0] }
                  ]
                },
                admissionNumber: { $arrayElemAt: ['$studentInfo.admissionNumber', 0] }
              },
              amount: '$totalAmount',
              paymentDate: '$paymentDate',
              paymentMethod: '$paymentMethod'
            }
          }
        }
      },
      { $sort: { '_id.className': 1, '_id.feeTypeName': 1 } }
    ]);

    res.json({
      success: true,
      data: { feeReport }
    });
  } catch (error) {
    console.error('Get fee report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating fee report'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    // Basic counts
    const totalStudents = await Student.countDocuments({ isActive: true });
    const totalTeachers = await Teacher.countDocuments({ isActive: true });
    const totalClasses = await Class.countDocuments({ isActive: true });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent fee collections (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentFeeCollection = await FeePayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: thirtyDaysAgo },
          status: 'Paid'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Upcoming exams (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingExams = await mongoose.model('Exam').countDocuments({
      date: { $gte: today, $lte: thirtyDaysFromNow },
      isActive: true
    });

    const stats = {
      summary: {
        totalStudents,
        totalTeachers,
        totalClasses,
        upcomingExams
      },
      todayAttendance,
      recentFeeCollection: recentFeeCollection[0] || { totalAmount: 0, count: 0 }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

module.exports = {
  getStudentReport,
  getClassReport,
  getAttendanceReport,
  getExamReport,
  getFeeReport,
  getDashboardStats
};