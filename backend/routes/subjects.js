const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignClasses,
  getSubjectStats
} = require('../controllers/subjectsController');

// Validation rules
const subjectValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Subject name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 10 }).withMessage('Subject code must be 2-10 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('type').isIn(['Core', 'Elective', 'Optional', 'Extra-curricular']).withMessage('Invalid subject type'),
  body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
  body('totalMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Total marks must be between 1 and 1000'),
  body('passMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Pass marks must be between 1 and 1000'),
  body('teacher').optional().isMongoId().withMessage('Valid teacher ID is required'),
  body('classes').optional().isArray().withMessage('Classes must be an array'),
  body('classes.*').optional().isMongoId().withMessage('Each class ID must be valid')
];

const updateSubjectValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Subject name must be 2-100 characters'),
  body('code').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Subject code must be 2-10 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('type').optional().isIn(['Core', 'Elective', 'Optional', 'Extra-curricular']).withMessage('Invalid subject type'),
  body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
  body('totalMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Total marks must be between 1 and 1000'),
  body('passMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Pass marks must be between 1 and 1000'),
  body('teacher').optional().isMongoId().withMessage('Valid teacher ID is required'),
  body('classes').optional().isArray().withMessage('Classes must be an array'),
  body('classes.*').optional().isMongoId().withMessage('Each class ID must be valid'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

const assignClassesValidation = [
  body('classIds').isArray({ min: 1 }).withMessage('At least one class ID is required'),
  body('classIds.*').isMongoId().withMessage('Each class ID must be valid')
];

// @route   GET /api/subjects
// @desc    Get all subjects
// @access  Private (Admin, Teacher, Student)
router.get('/', getSubjects);

// @route   GET /api/subjects/stats
// @desc    Get subject statistics
// @access  Private (Admin)
router.get('/stats', getSubjectStats);

// @route   GET /api/subjects/:id
// @desc    Get single subject
// @access  Private (Admin, Teacher, Student)
router.get('/:id', getSubject);

// @route   POST /api/subjects
// @desc    Create new subject
// @access  Private (Admin)
router.post('/', subjectValidation, createSubject);

// @route   PUT /api/subjects/:id
// @desc    Update subject
// @access  Private (Admin)
router.put('/:id', updateSubjectValidation, updateSubject);

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
// @access  Private (Admin)
router.delete('/:id', deleteSubject);

// @route   POST /api/subjects/:id/assign-classes
// @desc    Assign classes to subject
// @access  Private (Admin)
router.post('/:id/assign-classes', assignClassesValidation, assignClasses);

module.exports = router;