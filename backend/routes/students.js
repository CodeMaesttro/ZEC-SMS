const express = require('express');
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats
} = require('../controllers/studentsController');

const router = express.Router();

// Validation rules
const studentValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('admissionNumber').trim().notEmpty().withMessage('Admission number is required'),
  body('class').isMongoId().withMessage('Valid class ID is required'),
  body('section').isMongoId().withMessage('Valid section ID is required'),
  body('session').isMongoId().withMessage('Valid session ID is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required')
];

const updateStudentValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('class').optional().isMongoId().withMessage('Valid class ID is required'),
  body('section').optional().isMongoId().withMessage('Valid section ID is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required')
];

// Routes
router.get('/stats', authorize('Admin', 'Teacher'), getStudentStats);
router.get('/', authorize('Admin', 'Teacher'), getStudents);
router.get('/:id', authorize('Admin', 'Teacher', 'Student', 'Parent'), getStudent);
router.post('/', authorize('Admin'), studentValidation, createStudent);
router.put('/:id', authorize('Admin'), updateStudentValidation, updateStudent);
router.delete('/:id', authorize('Admin'), deleteStudent);

module.exports = router;