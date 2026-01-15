const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Attendance = require('../models/Attendance');
const FeePayment = require('../models/FeePayment');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const { role } = req.user;
    let stats = {};

    switch (role) {
      case 'Admin':
        stats = await getAdminStats();
        break;
      case 'Teacher':
        stats = await getTeacherStats(req.user._id);
        break;
      case 'Student':
        stats = await getStudentStats(req.user._id);
        break;
      case 'Parent':
        stats = await getParentStats(req.user._id);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// Admin dashboard statistics
const getAdminStats = async () => {
  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    activeStudents,
    recentActivities
  ] = await Promise.all([
    Student.countDocuments({ status: 'Active' }),
    User.countDocuments({ role: 'Teacher', isActive: true }),
    Class.countDocuments({ isActive: true }),
    Subject.countDocuments(),
    Student.countDocuments({ status: 'Active' }),
    getRecentActivities()
  ]);

  return {
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    activeStudents,
    recentActivities
  };
};

// Teacher dashboard statistics
const getTeacherStats = async (teacherId) => {
  // Find teacher record
  const teacher = await Teacher.findOne({ user: teacherId });
  if (!teacher) {
    return {
      myClasses: 0,
      myStudents: 0,
      pendingExams: 0,
      todayAttendance: 0
    };
  }

  const [
    myClasses,
    myStudents,
    pendingExams,
    todayAttendance
  ] = await Promise.all([
    Class.countDocuments({ classTeacher: teacherId }),
    Student.countDocuments({ 
      class: { $in: await Class.find({ classTeacher: teacherId }).select('_id') }
    }),
    Exam.countDocuments({ 
      teacher: teacherId,
      status: 'Scheduled'
    }),
    calculateTodayAttendance(teacherId)
  ]);

  return {
    myClasses,
    myStudents,
    pendingExams,
    todayAttendance
  };
};

// Student dashboard statistics
const getStudentStats = async (userId) => {
  const student = await Student.findOne({ user: userId });
  if (!student) {
    return {
      attendance: 0,
      averageMarks: 0,
      upcomingExams: 0,
      pendingFees: 0
    };
  }

  const [
    attendance,
    averageMarks,
    upcomingExams,
    pendingFees
  ] = await Promise.all([
    calculateStudentAttendance(student._id),
    calculateAverageMarks(student._id),
    Exam.countDocuments({
      class: student.class,
      examDate: { $gte: new Date() },
      status: 'Scheduled'
    }),
    calculatePendingFees(student._id)
  ]);

  return {
    attendance,
    averageMarks,
    upcomingExams,
    pendingFees
  };
};

// Parent dashboard statistics (similar to student)
const getParentStats = async (userId) => {
  // Find children of this parent
  const children = await Student.find({ parent: userId });
  if (children.length === 0) {
    return {
      totalChildren: 0,
      averageAttendance: 0,
      upcomingExams: 0,
      pendingFees: 0
    };
  }

  const childIds = children.map(child => child._id);
  const classIds = children.map(child => child.class);

  const [
    averageAttendance,
    upcomingExams,
    pendingFees
  ] = await Promise.all([
    calculateAverageAttendanceForChildren(childIds),
    Exam.countDocuments({
      class: { $in: classIds },
      examDate: { $gte: new Date() },
      status: 'Scheduled'
    }),
    calculatePendingFeesForChildren(childIds)
  ]);

  return {
    totalChildren: children.length,
    averageAttendance,
    upcomingExams,
    pendingFees
  };
};

// Helper functions
const getRecentActivities = async () => {
  // This would typically come from an activity log table
  // For now, return mock data
  return [
    {
      type: 'student_enrollment',
      message: 'New student enrolled',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      type: 'fee_payment',
      message: 'Fee payment received',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    {
      type: 'exam_scheduled',
      message: 'New exam scheduled',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];
};

const calculateTodayAttendance = async (teacherId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendanceRecords = await Attendance.find({
    teacher: teacherId,
    date: { $gte: today, $lt: tomorrow }
  });

  if (attendanceRecords.length === 0) return 0;

  const totalPresent = attendanceRecords.reduce((sum, record) => 
    sum + (record.status === 'Present' ? 1 : 0), 0
  );

  return Math.round((totalPresent / attendanceRecords.length) * 100);
};

const calculateStudentAttendance = async (studentId) => {
  const totalRecords = await Attendance.countDocuments({ student: studentId });
  if (totalRecords === 0) return 0;

  const presentRecords = await Attendance.countDocuments({ 
    student: studentId, 
    status: 'Present' 
  });

  return Math.round((presentRecords / totalRecords) * 100);
};

const calculateAverageMarks = async (studentId) => {
  // This would calculate from ExamMark model
  // For now, return a mock value
  return 85;
};

const calculatePendingFees = async (studentId) => {
  // This would calculate from FeePayment model
  // For now, return a mock value
  return 5000;
};

const calculateAverageAttendanceForChildren = async (childIds) => {
  if (childIds.length === 0) return 0;

  const attendancePromises = childIds.map(childId => calculateStudentAttendance(childId));
  const attendanceRates = await Promise.all(attendancePromises);
  
  const sum = attendanceRates.reduce((total, rate) => total + rate, 0);
  return Math.round(sum / attendanceRates.length);
};

const calculatePendingFeesForChildren = async (childIds) => {
  if (childIds.length === 0) return 0;

  const feePromises = childIds.map(childId => calculatePendingFees(childId));
  const fees = await Promise.all(feePromises);
  
  return fees.reduce((total, fee) => total + fee, 0);
};

module.exports = {
  getDashboardStats
};