const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  getExamResults,
  publishResults,
  getExamStats
} = require('../controllers/examsController');

// Validation rules
const examValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Exam name must be 2-200 characters'),
  body('class').isMongoId().withMessage('Valid class ID is required'),
  body('subject').isMongoId().withMessage('Valid subject ID is required'),
  body('examType').isMongoId().withMessage('Valid exam type ID is required'),
  body('examDate').isISO8601().withMessage('Valid exam date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM format)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM format)'),
  body('duration').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('totalMarks').isInt({ min: 1, max: 1000 }).withMessage('Total marks must be between 1 and 1000'),
  body('passMarks').isInt({ min: 1, max: 1000 }).withMessage('Pass marks must be between 1 and 1000'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
];

const updateExamValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Exam name must be 2-200 characters'),
  body('examDate').optional().isISO8601().withMessage('Valid exam date is required'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM format)'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM format)'),
  body('duration').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('totalMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Total marks must be between 1 and 1000'),
  body('passMarks').optional().isInt({ min: 1, max: 1000 }).withMessage('Pass marks must be between 1 and 1000'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('status').optional().isIn(['Scheduled', 'Ongoing', 'Completed', 'Cancelled']).withMessage('Invalid status')
];

// @route   GET /api/exams
// @desc    Get all exams
// @access  Private (Admin, Teacher, Student)
router.get('/', getExams);

// @route   GET /api/exams/stats
// @desc    Get exam statistics
// @access  Private (Admin, Teacher)
router.get('/stats', getExamStats);

// @route   GET /api/exams/:id
// @desc    Get single exam
// @access  Private (Admin, Teacher, Student)
router.get('/:id', getExam);

// @route   POST /api/exams
// @desc    Create new exam
// @access  Private (Admin, Teacher)
router.post('/', examValidation, createExam);

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private (Admin, Teacher-own)
router.put('/:id', updateExamValidation, updateExam);

// @route   DELETE /api/exams/:id
// @desc    Delete exam
// @access  Private (Admin)
router.delete('/:id', deleteExam);

// @route   GET /api/exams/:id/results
// @desc    Get exam results
// @access  Private (Admin, Teacher, Student-own)
router.get('/:id/results', getExamResults);

// @route   POST /api/exams/:id/publish
// @desc    Publish exam results
// @access  Private (Admin, Teacher-own)
router.post('/:id/publish', publishResults);

module.exports = router;