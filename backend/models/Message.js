const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  threadId: {
    type: String
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ isRead: 1, recipient: 1 });
messageSchema.index({ threadId: 1 });
messageSchema.index({ session: 1 });

// Pre-save middleware to generate thread ID
messageSchema.pre('save', function(next) {
  if (!this.threadId) {
    if (this.parentMessage) {
      // This is a reply, use parent's thread ID
      this.constructor.findById(this.parentMessage)
        .then(parent => {
          this.threadId = parent.threadId || parent._id.toString();
          next();
        })
        .catch(next);
    } else {
      // This is a new thread
      this.threadId = this._id.toString();
      next();
    }
  } else {
    next();
  }
});

// Method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  if (this.recipient.toString() === userId.toString() && !this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to toggle star
messageSchema.methods.toggleStar = function() {
  this.isStarred = !this.isStarred;
  return this.save();
};

// Method to archive message
messageSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Method to delete message for a user
messageSchema.methods.deleteForUser = function(userId) {
  const existingDelete = this.deletedBy.find(d => d.user.toString() === userId.toString());
  
  if (!existingDelete) {
    this.deletedBy.push({
      user: userId,
      deletedAt: new Date()
    });
  }
  
  // If both sender and recipient have deleted, mark as deleted
  if (this.deletedBy.length >= 2) {
    this.isDeleted = true;
  }
  
  return this.save();
};

// Static method to get inbox messages
messageSchema.statics.getInbox = function(userId, options = {}) {
  const query = {
    recipient: userId,
    isArchived: false,
    'deletedBy.user': { $ne: userId }
  };
  
  if (options.unreadOnly) {
    query.isRead = false;
  }
  
  return this.find(query)
    .populate('sender', 'firstName lastName profileImage role')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get sent messages
messageSchema.statics.getSent = function(userId, options = {}) {
  const query = {
    sender: userId,
    'deletedBy.user': { $ne: userId }
  };
  
  return this.find(query)
    .populate('recipient', 'firstName lastName profileImage role')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get starred messages
messageSchema.statics.getStarred = function(userId, options = {}) {
  const query = {
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    isStarred: true,
    'deletedBy.user': { $ne: userId }
  };
  
  return this.find(query)
    .populate('sender', 'firstName lastName profileImage role')
    .populate('recipient', 'firstName lastName profileImage role')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get conversation thread
messageSchema.statics.getThread = function(threadId, userId) {
  const query = {
    threadId: threadId,
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    'deletedBy.user': { $ne: userId }
  };
  
  return this.find(query)
    .populate('sender', 'firstName lastName profileImage role')
    .populate('recipient', 'firstName lastName profileImage role')
    .sort({ createdAt: 1 });
};

// Static method to count unread messages
messageSchema.statics.countUnread = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isArchived: false,
    'deletedBy.user': { $ne: userId }
  });
};

// Static method to search messages
messageSchema.statics.searchMessages = function(userId, searchTerm, options = {}) {
  const query = {
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    $and: [
      {
        $or: [
          { subject: { $regex: searchTerm, $options: 'i' } },
          { message: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ],
    'deletedBy.user': { $ne: userId }
  };
  
  return this.find(query)
    .populate('sender', 'firstName lastName profileImage role')
    .populate('recipient', 'firstName lastName profileImage role')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

module.exports = mongoose.model('Message', messageSchema);