const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  uploadProfileImage,
  getUserStats
} = require('../controllers/userController');
const { authorize, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['Admin', 'Teacher', 'Student', 'Parent'])
    .withMessage('Role must be Admin, Teacher, Student, or Parent')
];

const updateUserValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

// Routes
router.get('/', authorize('Admin'), getUsers);
router.get('/stats', isAdmin, getUserStats);
router.get('/role/:role', getUsersByRole);
router.get('/:id', getUser);
router.post('/', isAdmin, createUserValidation, createUser);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', isAdmin, deleteUser);
router.post('/:id/profile-image', upload.single('profileImage'), uploadProfileImage);

module.exports = router;