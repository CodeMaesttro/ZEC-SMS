const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAttendance,
  markAttendance,
  updateAttendance,
  getStudentAttendanceSummary,
  getClassAttendanceReport,
  getAttendanceStats
} = require('../controllers/attendanceController');

// Validation rules
const markAttendanceValidation = [
  body('class').isMongoId().withMessage('Valid class ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('attendanceData').isArray({ min: 1 }).withMessage('Attendance data is required'),
  body('attendanceData.*.student').isMongoId().withMessage('Valid student ID is required'),
  body('attendanceData.*.status').isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid attendance status'),
  body('attendanceData.*.remarks').optional().trim().isLength({ max: 200 }).withMessage('Remarks cannot exceed 200 characters'),
  body('section').optional().isMongoId().withMessage('Valid section ID is required'),
  body('subject').optional().isMongoId().withMessage('Valid subject ID is required')
];

const updateAttendanceValidation = [
  body('status').isIn(['Present', 'Absent', 'Late', 'Excused']).withMessage('Invalid attendance status'),
  body('remarks').optional().trim().isLength({ max: 200 }).withMessage('Remarks cannot exceed 200 characters')
];

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private (Admin, Teacher, Student-own, Parent-own)
router.get('/', getAttendance);

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private (Admin, Teacher)
router.get('/stats', getAttendanceStats);

// @route   POST /api/attendance/mark
// @desc    Mark attendance for a class
// @access  Private (Admin, Teacher)
router.post('/mark', markAttendanceValidation, markAttendance);

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Admin, Teacher)
router.put('/:id', updateAttendanceValidation, updateAttendance);

// @route   GET /api/attendance/student/:studentId/summary
// @desc    Get attendance summary for a student
// @access  Private (Admin, Teacher, Student-own, Parent-own)
router.get('/student/:studentId/summary', getStudentAttendanceSummary);

// @route   GET /api/attendance/class/:classId/report
// @desc    Get class attendance report
// @access  Private (Admin, Teacher)
router.get('/class/:classId/report', getClassAttendanceReport);

module.exports = router;