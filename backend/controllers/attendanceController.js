const { validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private (Admin, Teacher, Student-own, Parent-own)
const getAttendance = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      class: classId,
      section: sectionId,
      student: studentId,
      subject: subjectId,
      date,
      startDate,
      endDate,
      status
    } = req.query;

    // Build query based on user role
    let query = {};

    // Role-based filtering
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        query.student = student._id;
      }
    } else if (req.user.role === 'Parent') {
      const children = await Student.find({ parent: req.user._id });
      if (children.length > 0) {
        query.student = { $in: children.map(child => child._id) };
      }
    } else if (req.user.role === 'Teacher') {
      // Teachers can see attendance for their assigned classes
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (teacher) {
        const assignedClassIds = teacher.assignedClasses.map(ac => ac.class);
        query.class = { $in: assignedClassIds };
      }
    }

    // Apply filters
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;
    if (studentId) query.student = studentId;
    if (subjectId) query.subject = subjectId;
    if (status) query.status = status;

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDay };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Execute query with pagination
    const attendance = await Attendance.find(query)
      .populate('student', 'admissionNumber rollNumber')
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName profileImage'
        }
      })
      .populate('class', 'name grade')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: {
        attendance,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance'
    });
  }
};

// @desc    Mark attendance for a class
// @route   POST /api/attendance/mark
// @access  Private (Admin, Teacher)
const markAttendance = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      class: classId,
      section: sectionId,
      subject: subjectId,
      date,
      attendanceData // Array of { student, status, remarks }
    } = req.body;

    // Validate date is not in future
    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (attendanceDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark attendance for future dates'
      });
    }

    // Check if attendance already marked for this date
    const existingAttendance = await Attendance.findOne({
      class: classId,
      section: sectionId,
      subject: subjectId,
      date: {
        $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
        $lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this date. Use update endpoint to modify.'
      });
    }

    // Validate all students belong to the specified class/section
    const studentIds = attendanceData.map(item => item.student);
    const students = await Student.find({
      _id: { $in: studentIds },
      class: classId,
      ...(sectionId && { section: sectionId }),
      status: 'Active'
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some students do not belong to the specified class/section'
      });
    }

    // Create attendance records
    const attendanceRecords = attendanceData.map(item => ({
      student: item.student,
      class: classId,
      section: sectionId,
      subject: subjectId,
      date: new Date(date),
      status: item.status,
      remarks: item.remarks || '',
      markedBy: req.user._id
    }));

    const createdRecords = await Attendance.insertMany(attendanceRecords);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        recordsCreated: createdRecords.length,
        date: date,
        class: classId,
        section: sectionId,
        subject: subjectId
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking attendance'
    });
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (Admin, Teacher)
const updateAttendance = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Check if user has permission to update this record
    if (req.user.role === 'Teacher') {
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (teacher) {
        const assignedClassIds = teacher.assignedClasses.map(ac => ac.class.toString());
        if (!assignedClassIds.includes(attendance.class.toString())) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only update attendance for your assigned classes.'
          });
        }
      }
    }

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      {
        status,
        remarks,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'student', select: 'admissionNumber rollNumber', populate: { path: 'user', select: 'firstName lastName' } },
      { path: 'class', select: 'name grade' },
      { path: 'section', select: 'name' },
      { path: 'subject', select: 'name code' }
    ]);

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: { attendance: updatedAttendance }
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating attendance'
    });
  }
};

// @desc    Get attendance summary for a student
// @route   GET /api/attendance/student/:studentId/summary
// @access  Private (Admin, Teacher, Student-own, Parent-own)
const getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, subject } = req.query;

    // Check permissions
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own attendance.'
        });
      }
    } else if (req.user.role === 'Parent') {
      const student = await Student.findOne({ _id: studentId, parent: req.user._id });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your child\'s attendance.'
        });
      }
    }

    // Build query
    let query = { student: studentId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (subject) {
      query.subject = subject;
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find(query)
      .populate('subject', 'name code')
      .sort({ date: 1 });

    // Calculate summary
    const summary = {
      totalDays: attendanceRecords.length,
      presentDays: attendanceRecords.filter(record => record.status === 'Present').length,
      absentDays: attendanceRecords.filter(record => record.status === 'Absent').length,
      lateDays: attendanceRecords.filter(record => record.status === 'Late').length,
      excusedDays: attendanceRecords.filter(record => record.status === 'Excused').length,
      attendancePercentage: 0
    };

    if (summary.totalDays > 0) {
      summary.attendancePercentage = Math.round(
        ((summary.presentDays + summary.lateDays + summary.excusedDays) / summary.totalDays) * 100
      );
    }

    // Subject-wise summary
    const subjectWise = {};
    attendanceRecords.forEach(record => {
      const subjectName = record.subject?.name || 'General';
      if (!subjectWise[subjectName]) {
        subjectWise[subjectName] = {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          percentage: 0
        };
      }
      
      subjectWise[subjectName].total++;
      subjectWise[subjectName][record.status.toLowerCase()]++;
    });

    // Calculate percentages for each subject
    Object.keys(subjectWise).forEach(subject => {
      const data = subjectWise[subject];
      if (data.total > 0) {
        data.percentage = Math.round(
          ((data.present + data.late + data.excused) / data.total) * 100
        );
      }
    });

    res.json({
      success: true,
      data: {
        summary,
        subjectWise,
        records: attendanceRecords
      }
    });
  } catch (error) {
    console.error('Get student attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance summary'
    });
  }
};

// @desc    Get class attendance report
// @route   GET /api/attendance/class/:classId/report
// @access  Private (Admin, Teacher)
const getClassAttendanceReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate, section, subject } = req.query;

    // Build query
    let query = { class: classId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (section) query.section = section;
    if (subject) query.subject = subject;

    // Get attendance data
    const attendanceData = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            student: '$student',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            }
          },
          status: { $first: '$status' },
          subject: { $first: '$subject' }
        }
      },
      {
        $group: {
          _id: '$_id.student',
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Present', 'Late', 'Excused']] },
                1,
                0
              ]
            }
          },
          absentDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student.user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          student: { $arrayElemAt: ['$student', 0] },
          user: { $arrayElemAt: ['$user', 0] },
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          attendancePercentage: {
            $cond: [
              { $gt: ['$totalDays', 0] },
              {
                $multiply: [
                  { $divide: ['$presentDays', '$totalDays'] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { 'student.rollNumber': 1 } }
    ]);

    // Calculate class statistics
    const classStats = {
      totalStudents: attendanceData.length,
      averageAttendance: 0,
      studentsAbove90: 0,
      studentsBelow75: 0
    };

    if (attendanceData.length > 0) {
      const totalPercentage = attendanceData.reduce((sum, student) => sum + student.attendancePercentage, 0);
      classStats.averageAttendance = Math.round(totalPercentage / attendanceData.length);
      classStats.studentsAbove90 = attendanceData.filter(student => student.attendancePercentage >= 90).length;
      classStats.studentsBelow75 = attendanceData.filter(student => student.attendancePercentage < 75).length;
    }

    res.json({
      success: true,
      data: {
        classStats,
        studentData: attendanceData
      }
    });
  } catch (error) {
    console.error('Get class attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class attendance report'
    });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private (Admin, Teacher)
const getAttendanceStats = async (req, res) => {
  try {
    const { session, class: classId, startDate, endDate } = req.query;
    let matchQuery = {};

    if (session) matchQuery.session = mongoose.Types.ObjectId(session);
    if (classId) matchQuery.class = mongoose.Types.ObjectId(classId);

    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Role-based filtering for teachers
    if (req.user.role === 'Teacher') {
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (teacher) {
        const assignedClassIds = teacher.assignedClasses.map(ac => ac.class);
        matchQuery.class = { $in: assignedClassIds };
      }
    }

    const stats = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyStats = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            }
          },
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Present'] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.date': 1 } },
      { $limit: 30 } // Last 30 days
    ]);

    const summary = {
      total: await Attendance.countDocuments(matchQuery),
      present: stats.find(s => s._id === 'Present')?.count || 0,
      absent: stats.find(s => s._id === 'Absent')?.count || 0,
      late: stats.find(s => s._id === 'Late')?.count || 0,
      excused: stats.find(s => s._id === 'Excused')?.count || 0
    };

    summary.attendanceRate = summary.total > 0 ? 
      Math.round(((summary.present + summary.late + summary.excused) / summary.total) * 100) : 0;

    res.json({
      success: true,
      data: {
        summary,
        statusWise: stats,
        daily: dailyStats
      }
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance statistics'
    });
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  updateAttendance,
  getStudentAttendanceSummary,
  getClassAttendanceReport,
  getAttendanceStats
};