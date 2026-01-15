const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getBooks,
  getBook,
  addBook,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getLibraryStats,
  searchBooks
} = require('../controllers/libraryController');
const { protect } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Book management routes
router.get('/', protect, getBooks);
router.get('/search', protect, searchBooks);
router.get('/stats', protect, roleAuth(['Admin', 'Librarian']), getLibraryStats);
router.get('/:id', protect, getBook);

router.post('/', [
  protect,
  roleAuth(['Admin', 'Librarian']),
  body('title').notEmpty().withMessage('Book title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('category').isIn(['Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Other'])
    .withMessage('Invalid category'),
  body('totalCopies').isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('isbn').optional().isLength({ min: 10, max: 20 }).withMessage('ISBN must be between 10-20 characters'),
  body('publicationYear').optional().isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Invalid publication year')
], addBook);

router.put('/:id', [
  protect,
  roleAuth(['Admin', 'Librarian']),
  body('title').optional().notEmpty().withMessage('Book title cannot be empty'),
  body('author').optional().notEmpty().withMessage('Author cannot be empty'),
  body('category').optional().isIn(['Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Other'])
    .withMessage('Invalid category'),
  body('totalCopies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('isbn').optional().isLength({ min: 10, max: 20 }).withMessage('ISBN must be between 10-20 characters'),
  body('publicationYear').optional().isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Invalid publication year')
], updateBook);

router.delete('/:id', protect, roleAuth(['Admin', 'Librarian']), deleteBook);

// Book issue/return routes
router.post('/:id/issue', [
  protect,
  roleAuth(['Admin', 'Librarian']),
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], issueBook);

router.post('/:id/return', [
  protect,
  roleAuth(['Admin', 'Librarian']),
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('returnDate').optional().isISO8601().withMessage('Valid return date is required'),
  body('condition').optional().isIn(['Good', 'Fair', 'Poor', 'Damaged']).withMessage('Invalid condition')
], returnBook);

module.exports = router;