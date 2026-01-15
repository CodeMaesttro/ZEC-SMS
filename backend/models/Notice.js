const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notice title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Notice content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: ['General', 'Academic', 'Examination', 'Event', 'Holiday', 'Fee', 'Admission', 'Sports', 'Emergency', 'Other'],
    default: 'General'
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  targetAudience: {
    type: [String],
    enum: ['All', 'Students', 'Teachers', 'Parents', 'Admin'],
    default: ['All']
  },
  targetClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for active status
noticeSchema.virtual('isExpired').get(function() {
  return this.expiryDate && new Date() > this.expiryDate;
});

// Virtual for days remaining
noticeSchema.virtual('daysRemaining').get(function() {
  if (!this.expiryDate) return null;
  
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Indexes
noticeSchema.index({ publishDate: -1 });
noticeSchema.index({ category: 1 });
noticeSchema.index({ priority: 1 });
noticeSchema.index({ targetAudience: 1 });
noticeSchema.index({ targetClasses: 1 });
noticeSchema.index({ isPublished: 1, isActive: 1 });
noticeSchema.index({ isPinned: 1 });
noticeSchema.index({ expiryDate: 1 });
noticeSchema.index({ session: 1 });

// Text index for search
noticeSchema.index({ title: 'text', content: 'text' });

// Method to increment view count
noticeSchema.methods.incrementView = function(userId) {
  // Check if user has already viewed
  const hasViewed = this.viewedBy.some(view => view.user.toString() === userId.toString());
  
  if (!hasViewed) {
    this.viewedBy.push({ user: userId });
    this.viewCount += 1;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method to get notices for user
noticeSchema.statics.getForUser = function(userRole, userClasses = [], options = {}) {
  const query = {
    isPublished: true,
    isActive: true,
    publishDate: { $lte: new Date() }
  };
  
  // Add expiry filter
  if (!options.includeExpired) {
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ];
  }
  
  // Filter by target audience
  query.$and = [
    {
      $or: [
        { targetAudience: 'All' },
        { targetAudience: userRole }
      ]
    }
  ];
  
  // Filter by target classes if user has classes
  if (userClasses.length > 0) {
    query.$and.push({
      $or: [
        { targetClasses: { $size: 0 } },
        { targetClasses: { $in: userClasses } }
      ]
    });
  }
  
  const sortOrder = { isPinned: -1, publishDate: -1 };
  
  return this.find(query)
    .populate('targetClasses', 'name grade')
    .populate('createdBy', 'firstName lastName role')
    .sort(sortOrder)
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to search notices
noticeSchema.statics.searchNotices = function(searchTerm, filters = {}) {
  const query = {
    isPublished: true,
    isActive: true
  };
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.targetAudience) {
    query.targetAudience = filters.targetAudience;
  }
  
  if (filters.dateFrom) {
    query.publishDate = { $gte: new Date(filters.dateFrom) };
  }
  
  if (filters.dateTo) {
    query.publishDate = { ...query.publishDate, $lte: new Date(filters.dateTo) };
  }
  
  const sortOrder = searchTerm 
    ? { score: { $meta: 'textScore' }, isPinned: -1, publishDate: -1 }
    : { isPinned: -1, publishDate: -1 };
  
  return this.find(query)
    .populate('targetClasses', 'name grade')
    .populate('createdBy', 'firstName lastName role')
    .sort(sortOrder);
};

// Static method to get recent notices
noticeSchema.statics.getRecent = function(limit = 5) {
  return this.find({
    isPublished: true,
    isActive: true,
    publishDate: { $lte: new Date() },
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  })
  .populate('createdBy', 'firstName lastName role')
  .sort({ isPinned: -1, publishDate: -1 })
  .limit(limit);
};

// Static method to get pinned notices
noticeSchema.statics.getPinned = function() {
  return this.find({
    isPinned: true,
    isPublished: true,
    isActive: true,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  })
  .populate('createdBy', 'firstName lastName role')
  .sort({ publishDate: -1 });
};

module.exports = mongoose.model('Notice', noticeSchema);