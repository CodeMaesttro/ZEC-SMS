const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getNotices,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  togglePin,
  searchNotices,
  getRecentNotices,
  getPinnedNotices,
  getNoticeStats
} = require('../controllers/noticesController');
const { protect } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Notice routes
router.get('/', protect, getNotices);
router.get('/search', protect, searchNotices);
router.get('/recent', protect, getRecentNotices);
router.get('/pinned', protect, getPinnedNotices);
router.get('/stats', protect, roleAuth(['Admin']), getNoticeStats);
router.get('/:id', protect, getNotice);

router.post('/', [
  protect,
  roleAuth(['Admin']),
  body('title').notEmpty().withMessage('Notice title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('content').notEmpty().withMessage('Notice content is required')
    .isLength({ max: 5000 }).withMessage('Content cannot exceed 5000 characters'),
  body('category').optional().isIn(['General', 'Academic', 'Examination', 'Event', 'Holiday', 'Fee', 'Admission', 'Sports', 'Emergency', 'Other'])
    .withMessage('Invalid category'),
  body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Invalid priority'),
  body('targetAudience').optional().isArray().withMessage('Target audience must be an array'),
  body('targetAudience.*').optional().isIn(['All', 'Students', 'Teachers', 'Parents', 'Admin'])
    .withMessage('Invalid target audience'),
  body('publishDate').optional().isISO8601().withMessage('Invalid publish date'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date')
], createNotice);

router.put('/:id', [
  protect,
  roleAuth(['Admin']),
  body('title').optional().notEmpty().withMessage('Notice title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('content').optional().notEmpty().withMessage('Notice content cannot be empty')
    .isLength({ max: 5000 }).withMessage('Content cannot exceed 5000 characters'),
  body('category').optional().isIn(['General', 'Academic', 'Examination', 'Event', 'Holiday', 'Fee', 'Admission', 'Sports', 'Emergency', 'Other'])
    .withMessage('Invalid category'),
  body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Invalid priority'),
  body('targetAudience').optional().isArray().withMessage('Target audience must be an array'),
  body('targetAudience.*').optional().isIn(['All', 'Students', 'Teachers', 'Parents', 'Admin'])
    .withMessage('Invalid target audience'),
  body('publishDate').optional().isISO8601().withMessage('Invalid publish date'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date')
], updateNotice);

router.delete('/:id', protect, roleAuth(['Admin']), deleteNotice);
router.put('/:id/pin', protect, roleAuth(['Admin']), togglePin);

module.exports = router;