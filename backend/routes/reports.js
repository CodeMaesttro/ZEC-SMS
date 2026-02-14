const express = require('express');
const router = express.Router();
const {
  getStudentReport,
  getClassReport,
  getAttendanceReport,
  getExamReport,
  getFeeReport,
  getDashboardStats
} = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Dashboard statistics
router.get('/dashboard', protect, roleAuth(['Admin']), getDashboardStats);

// Student reports
router.get('/student/:studentId', protect, getStudentReport);

// Class reports
router.get('/class/:classId', protect, roleAuth(['Admin', 'Teacher']), getClassReport);

// Attendance reports
router.get('/attendance', protect, roleAuth(['Admin', 'Teacher']), getAttendanceReport);

// Exam reports
router.get('/exam/:examId', protect, roleAuth(['Admin', 'Teacher']), getExamReport);

// Fee reports
router.get('/fees', protect, roleAuth(['Admin']), getFeeReport);

module.exports = router;