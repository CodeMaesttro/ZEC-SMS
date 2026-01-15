const express = require('express');
const { body } = require('express-validator');
const { authorize } = require('../middleware/auth');
const {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  getClassStats
} = require('../controllers/classesController');

const router = express.Router();

// Validation rules
const classValidation = [
  body('name').trim().notEmpty().withMessage('Class name is required'),
  body('grade').isInt({ min: 1, max: 12 }).withMessage('Grade must be between 1 and 12'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
  body('session').isMongoId().withMessage('Valid session ID is required'),
  body('classTeacher').optional().isMongoId().withMessage('Valid teacher ID is required')
];

const updateClassValidation = [
  body('name').optional().trim().notEmpty().withMessage('Class name cannot be empty'),
  body('grade').optional().isInt({ min: 1, max: 12 }).withMessage('Grade must be between 1 and 12'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
  body('classTeacher').optional().isMongoId().withMessage('Valid teacher ID is required')
];

// Routes
router.get('/stats', authorize('Admin', 'Teacher'), getClassStats);
router.get('/', authorize('Admin', 'Teacher'), getClasses);
router.get('/:id', authorize('Admin', 'Teacher'), getClass);
router.get('/:id/students', authorize('Admin', 'Teacher'), getClassStudents);
router.post('/', authorize('Admin'), classValidation, createClass);
router.put('/:id', authorize('Admin'), updateClassValidation, updateClass);
router.delete('/:id', authorize('Admin'), deleteClass);

module.exports = router; 