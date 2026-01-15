const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get inbox messages
// @route   GET /api/messages/inbox
// @access  Private
const getInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (page - 1) * limit,
      unreadOnly: unreadOnly === 'true'
    };

    const messages = await Message.getInbox(req.user._id, options);
    const total = await Message.countDocuments({
      recipient: req.user._id,
      isArchived: false,
      'deletedBy.user': { $ne: req.user._id }
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching inbox'
    });
  }
};

// @desc    Get sent messages
// @route   GET /api/messages/sent
// @access  Private
const getSent = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (page - 1) * limit
    };

    const messages = await Message.getSent(req.user._id, options);
    const total = await Message.countDocuments({
      sender: req.user._id,
      'deletedBy.user': { $ne: req.user._id }
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get sent messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sent messages'
    });
  }
};

// @desc    Get starred messages
// @route   GET /api/messages/starred
// @access  Private
const getStarred = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (page - 1) * limit
    };

    const messages = await Message.getStarred(req.user._id, options);
    const total = await Message.countDocuments({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      isStarred: true,
      'deletedBy.user': { $ne: req.user._id }
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get starred messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching starred messages'
    });
  }
};

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
const getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName profileImage role')
      .populate('recipient', 'firstName lastName profileImage role');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user has access to this message
    const userId = req.user._id.toString();
    const senderId = message.sender._id.toString();
    const recipientId = message.recipient._id.toString();

    if (userId !== senderId && userId !== recipientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if message is deleted for this user
    const isDeleted = message.deletedBy.some(d => d.user.toString() === userId);
    if (isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark as read if recipient is viewing
    if (userId === recipientId) {
      await message.markAsRead(req.user._id);
    }

    res.json({
      success: true,
      data: { message }
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching message'
    });
  }
};

// @desc    Send message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { recipient, subject, message, priority, parentMessage } = req.body;

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create message
    const newMessage = await Message.create({
      sender: req.user._id,
      recipient,
      subject,
      message,
      priority: priority || 'Normal',
      parentMessage,
      session: req.user.session
    });

    // Populate the response
    await newMessage.populate([
      { path: 'sender', select: 'firstName lastName profileImage role' },
      { path: 'recipient', select: 'firstName lastName profileImage role' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
};

// @desc    Reply to message
// @route   POST /api/messages/:id/reply
// @access  Private
const replyMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const originalMessage = await Message.findById(req.params.id);

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }

    // Check if user has access to reply
    const userId = req.user._id.toString();
    const senderId = originalMessage.sender.toString();
    const recipientId = originalMessage.recipient.toString();

    if (userId !== senderId && userId !== recipientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { message, priority } = req.body;

    // Determine reply recipient (sender becomes recipient and vice versa)
    const replyRecipient = userId === senderId ? recipientId : senderId;

    // Create reply
    const reply = await Message.create({
      sender: req.user._id,
      recipient: replyRecipient,
      subject: `Re: ${originalMessage.subject}`,
      message,
      priority: priority || 'Normal',
      parentMessage: originalMessage._id,
      threadId: originalMessage.threadId,
      session: req.user.session
    });

    // Populate the response
    await reply.populate([
      { path: 'sender', select: 'firstName lastName profileImage role' },
      { path: 'recipient', select: 'firstName lastName profileImage role' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: { message: reply }
    });
  } catch (error) {
    console.error('Reply message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending reply'
    });
  }
};

// @desc    Get conversation thread
// @route   GET /api/messages/thread/:threadId
// @access  Private
const getThread = async (req, res) => {
  try {
    const { threadId } = req.params;

    const messages = await Message.getThread(threadId, req.user._id);

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Thread not found'
      });
    }

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching thread'
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the recipient
    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.markAsRead(req.user._id);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking message as read'
    });
  }
};

// @desc    Toggle star message
// @route   PUT /api/messages/:id/star
// @access  Private
const toggleStar = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user has access to this message
    const userId = req.user._id.toString();
    const senderId = message.sender.toString();
    const recipientId = message.recipient.toString();

    if (userId !== senderId && userId !== recipientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.toggleStar();

    res.json({
      success: true,
      message: message.isStarred ? 'Message starred' : 'Message unstarred',
      data: { isStarred: message.isStarred }
    });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling star'
    });
  }
};

// @desc    Archive message
// @route   PUT /api/messages/:id/archive
// @access  Private
const archiveMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the recipient
    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.archive();

    res.json({
      success: true,
      message: 'Message archived'
    });
  } catch (error) {
    console.error('Archive message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while archiving message'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user has access to this message
    const userId = req.user._id.toString();
    const senderId = message.sender.toString();
    const recipientId = message.recipient.toString();

    if (userId !== senderId && userId !== recipientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.deleteForUser(req.user._id);

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
};

// @desc    Search messages
// @route   GET /api/messages/search
// @access  Private
const searchMessages = async (req, res) => {
  try {
    const { q: searchTerm, page = 1, limit = 20 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const options = {
      limit: parseInt(limit),
      skip: (page - 1) * limit
    };

    const messages = await Message.searchMessages(req.user._id, searchTerm, options);

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching messages'
    });
  }
};

// @desc    Get unread count
// @route   GET /api/messages/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countUnread(req.user._id);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count'
    });
  }
};

// @desc    Get users for messaging
// @route   GET /api/messages/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;

    let query = { _id: { $ne: req.user._id }, isActive: true };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('firstName lastName email role profileImage')
      .sort({ firstName: 1, lastName: 1 })
      .limit(50);

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

module.exports = {
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
};