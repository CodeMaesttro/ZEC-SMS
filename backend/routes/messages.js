const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getInbox,
  getSent,
  getStarred,
  getMessage,
  sendMessage,
  replyMessage,
  getThread,
  markAsRead,
  toggleStar,
  archiveMessage,
  deleteMessage,
  searchMessages,
  getUnreadCount,
  getUsers
} = require('../controllers/messagesController');
const { protect } = require('../middleware/auth');

// Message box routes
router.get('/inbox', protect, getInbox);
router.get('/sent', protect, getSent);
router.get('/starred', protect, getStarred);
router.get('/search', protect, searchMessages);
router.get('/unread-count', protect, getUnreadCount);
router.get('/users', protect, getUsers);

// Thread routes
router.get('/thread/:threadId', protect, getThread);

// Individual message routes
router.get('/:id', protect, getMessage);

router.post('/', [
  protect,
  body('recipient').isMongoId().withMessage('Valid recipient ID is required'),
  body('subject').notEmpty().withMessage('Subject is required')
    .isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters'),
  body('message').notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
  body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Invalid priority level')
], sendMessage);

router.post('/:id/reply', [
  protect,
  body('message').notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters'),
  body('priority').optional().isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Invalid priority level')
], replyMessage);

// Message actions
router.put('/:id/read', protect, markAsRead);
router.put('/:id/star', protect, toggleStar);
router.put('/:id/archive', protect, archiveMessage);
router.delete('/:id', protect, deleteMessage);

module.exports = router;