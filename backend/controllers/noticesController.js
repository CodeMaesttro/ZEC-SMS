const { validationResult } = require('express-validator');
const Notice = require('../models/Notice');
const Class = require('../models/Class');
const Student = require('../models/Student');
const mongoose = require('mongoose');

// @desc    Get notices
// @route   GET /api/notices
// @access  Private
const getNotices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      priority,
      targetAudience,
      includeExpired = false,
      pinnedOnly = false
    } = req.query;

    let userClasses = [];

    // Get user's classes if they are a student
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id }).populate('class');
      if (student && student.class) {
        userClasses = [student.class._id];
      }
    }

    let notices;
    let total;

    if (pinnedOnly === 'true') {
      notices = await Notice.getPinned();
      total = notices.length;
    } else {
      const options = {
        limit: parseInt(limit),
        skip: (page - 1) * limit,
        includeExpired: includeExpired === 'true'
      };

      notices = await Notice.getForUser(req.user.role, userClasses, options);

      // Apply additional filters
      let query = {
        isPublished: true,
        isActive: true,
        publishDate: { $lte: new Date() }
      };

      if (includeExpired !== 'true') {
        query.$or = [
          { expiryDate: { $exists: false } },
          { expiryDate: null },
          { expiryDate: { $gt: new Date() } }
        ];
      }

      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (targetAudience) query.targetAudience = targetAudience;

      // Filter by user role and classes
      query.$and = [
        {
          $or: [
            { targetAudience: 'All' },
            { targetAudience: req.user.role }
          ]
        }
      ];

      if (userClasses.length > 0) {
        query.$and.push({
          $or: [
            { targetClasses: { $size: 0 } },
            { targetClasses: { $in: userClasses } }
          ]
        });
      }

      total = await Notice.countDocuments(query);
    }

    res.json({
      success: true,
      data: {
        notices,
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
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notices'
    });
  }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
// @access  Private
const getNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('targetClasses', 'name grade')
      .populate('createdBy', 'firstName lastName role')
      .populate('updatedBy', 'firstName lastName role');

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Check if notice is published and active
    if (!notice.isPublished || !notice.isActive) {
      // Only admin can view unpublished notices
      if (req.user.role !== 'Admin') {
        return res.status(404).json({
          success: false,
          message: 'Notice not found'
        });
      }
    }

    // Increment view count
    await notice.incrementView(req.user._id);

    res.json({
      success: true,
      data: { notice }
    });
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notice'
    });
  }
};

// @desc    Create notice
// @route   POST /api/notices
// @access  Private (Admin)
const createNotice = async (req, res) => {
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

    const {
      title,
      content,
      category,
      priority,
      targetAudience,
      targetClasses,
      publishDate,
      expiryDate,
      isPublished,
      isPinned
    } = req.body;

    // Create notice
    const notice = await Notice.create({
      title,
      content,
      category: category || 'General',
      priority: priority || 'Normal',
      targetAudience: targetAudience || ['All'],
      targetClasses: targetClasses || [],
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isPublished: isPublished !== undefined ? isPublished : true,
      isPinned: isPinned || false,
      session: req.user.session,
      createdBy: req.user._id
    });

    // Populate the response
    await notice.populate([
      { path: 'targetClasses', select: 'name grade' },
      { path: 'createdBy', select: 'firstName lastName role' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: { notice }
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notice'
    });
  }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private (Admin)
const updateNotice = async (req, res) => {
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

    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    const {
      title,
      content,
      category,
      priority,
      targetAudience,
      targetClasses,
      publishDate,
      expiryDate,
      isPublished,
      isPinned
    } = req.body;

    // Update notice
    const updatedNotice = await Notice.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        category,
        priority,
        targetAudience,
        targetClasses: targetClasses || [],
        publishDate: publishDate ? new Date(publishDate) : notice.publishDate,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isPublished: isPublished !== undefined ? isPublished : notice.isPublished,
        isPinned: isPinned !== undefined ? isPinned : notice.isPinned,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'targetClasses', select: 'name grade' },
      { path: 'createdBy', select: 'firstName lastName role' },
      { path: 'updatedBy', select: 'firstName lastName role' }
    ]);

    res.json({
      success: true,
      message: 'Notice updated successfully',
      data: { notice: updatedNotice }
    });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notice'
    });
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin)
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Soft delete
    notice.isActive = false;
    notice.updatedBy = req.user._id;
    await notice.save();

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notice'
    });
  }
};

// @desc    Toggle pin notice
// @route   PUT /api/notices/:id/pin
// @access  Private (Admin)
const togglePin = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    notice.isPinned = !notice.isPinned;
    notice.updatedBy = req.user._id;
    await notice.save();

    res.json({
      success: true,
      message: notice.isPinned ? 'Notice pinned' : 'Notice unpinned',
      data: { isPinned: notice.isPinned }
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling pin'
    });
  }
};

// @desc    Search notices
// @route   GET /api/notices/search
// @access  Private
const searchNotices = async (req, res) => {
  try {
    const { q: searchTerm, category, priority, targetAudience, dateFrom, dateTo } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const filters = {};
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (targetAudience) filters.targetAudience = targetAudience;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const notices = await Notice.searchNotices(searchTerm, filters);

    res.json({
      success: true,
      data: { notices }
    });
  } catch (error) {
    console.error('Search notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching notices'
    });
  }
};

// @desc    Get recent notices
// @route   GET /api/notices/recent
// @access  Private
const getRecentNotices = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const notices = await Notice.getRecent(parseInt(limit));

    res.json({
      success: true,
      data: { notices }
    });
  } catch (error) {
    console.error('Get recent notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent notices'
    });
  }
};

// @desc    Get pinned notices
// @route   GET /api/notices/pinned
// @access  Private
const getPinnedNotices = async (req, res) => {
  try {
    const notices = await Notice.getPinned();

    res.json({
      success: true,
      data: { notices }
    });
  } catch (error) {
    console.error('Get pinned notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pinned notices'
    });
  }
};

// @desc    Get notice statistics
// @route   GET /api/notices/stats
// @access  Private (Admin)
const getNoticeStats = async (req, res) => {
  try {
    // Basic statistics
    const totalNotices = await Notice.countDocuments({ isActive: true });
    const publishedNotices = await Notice.countDocuments({ isActive: true, isPublished: true });
    const pinnedNotices = await Notice.countDocuments({ isActive: true, isPinned: true });
    const expiredNotices = await Notice.countDocuments({
      isActive: true,
      expiryDate: { $lt: new Date() }
    });

    // Category wise distribution
    const categoryStats = await Notice.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Priority wise distribution
    const priorityStats = await Notice.aggregate([
      { $match: { isActive: true, isPublished: true } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Most viewed notices
    const popularNotices = await Notice.find({ isActive: true, isPublished: true })
      .sort({ viewCount: -1 })
      .limit(10)
      .select('title category viewCount publishDate')
      .populate('createdBy', 'firstName lastName');

    // Recent notices
    const recentNotices = await Notice.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title category isPublished publishDate')
      .populate('createdBy', 'firstName lastName');

    const stats = {
      summary: {
        totalNotices,
        publishedNotices,
        pinnedNotices,
        expiredNotices
      },
      categoryStats,
      priorityStats,
      popularNotices,
      recentNotices
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get notice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notice statistics'
    });
  }
};

module.exports = {
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
};