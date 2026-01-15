const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignClass,
  assignSubject,
  getTeacherSchedule,
  getTeacherStats
} = require('../controllers/teachersController');

// Validation rules
const teacherValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('designation').trim().isLength({ min: 2, max: 100 }).withMessage('Designation must be 2-100 characters'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  body('qualification').optional().trim().isLength({ max: 200 }).withMessage('Qualification cannot exceed 200 characters'),
  body('experience').optional().trim().isLength({ max: 100 }).withMessage('Experience cannot exceed 100 characters'),
  body('phone').optional().trim().isLength({ max: 15 }).withMessage('Phone number cannot exceed 15 characters'),
  body('salary.basic').optional().isNumeric().withMessage('Basic salary must be a number'),
  body('salary.allowances').optional().isNumeric().withMessage('Allowances must be a number'),
  body('salary.deductions').optional().isNumeric().withMessage('Deductions must be a number')
];

const updateTeacherValidation = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('designation').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Designation must be 2-100 characters'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  body('qualification').optional().trim().isLength({ max: 200 }).withMessage('Qualification cannot exceed 200 characters'),
  body('experience').optional().trim().isLength({ max: 100 }).withMessage('Experience cannot exceed 100 characters'),
  body('phone').optional().trim().isLength({ max: 15 }).withMessage('Phone number cannot exceed 15 characters'),
  body('salary.basic').optional().isNumeric().withMessage('Basic salary must be a number'),
  body('salary.allowances').optional().isNumeric().withMessage('Allowances must be a number'),
  body('salary.deductions').optional().isNumeric().withMessage('Deductions must be a number'),
  body('status').optional().isIn(['Active', 'Inactive', 'On Leave', 'Terminated']).withMessage('Invalid status')
];

const assignClassValidation = [
  body('classId').isMongoId().withMessage('Valid class ID is required'),
  body('sectionId').optional().isMongoId().withMessage('Valid section ID is required'),
  body('isClassTeacher').optional().isBoolean().withMessage('isClassTeacher must be a boolean')
];

const assignSubjectValidation = [
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('classIds').optional().isArray().withMessage('Class IDs must be an array'),
  body('classIds.*').optional().isMongoId().withMessage('Each class ID must be valid')
];

// @route   GET /api/teachers
// @desc    Get all teachers
// @access  Private (Admin, Teacher)
router.get('/', getTeachers);

// @route   GET /api/teachers/stats
// @desc    Get teacher statistics
// @access  Private (Admin)
router.get('/stats', getTeacherStats);

// @route   GET /api/teachers/:id
// @desc    Get single teacher
// @access  Private (Admin, Teacher)
router.get('/:id', getTeacher);

// @route   POST /api/teachers
// @desc    Create new teacher
// @access  Private (Admin)
router.post('/', teacherValidation, createTeacher);

// @route   PUT /api/teachers/:id
// @desc    Update teacher
// @access  Private (Admin)
router.put('/:id', updateTeacherValidation, updateTeacher);

// @route   DELETE /api/teachers/:id
// @desc    Delete teacher
// @access  Private (Admin)
router.delete('/:id', deleteTeacher);

// @route   POST /api/teachers/:id/assign-class
// @desc    Assign class to teacher
// @access  Private (Admin)
router.post('/:id/assign-class', assignClassValidation, assignClass);

// @route   POST /api/teachers/:id/assign-subject
// @desc    Assign subject to teacher
// @access  Private (Admin)
router.post('/:id/assign-subject', assignSubjectValidation, assignSubject);

// @route   GET /api/teachers/:id/schedule
// @desc    Get teacher schedule
// @access  Private (Admin, Teacher)
router.get('/:id/schedule', getTeacherSchedule);

module.exports = router;