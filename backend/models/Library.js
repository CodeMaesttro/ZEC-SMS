const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    trim: true,
    maxlength: [20, 'ISBN cannot exceed 20 characters']
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher cannot exceed 100 characters']
  },
  publicationYear: {
    type: Number,
    min: [1800, 'Publication year must be after 1800'],
    max: [new Date().getFullYear(), 'Publication year cannot be in the future']
  },
  edition: {
    type: String,
    trim: true,
    maxlength: [50, 'Edition cannot exceed 50 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Textbook', 'Reference', 'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 'Geography', 'Literature', 'Other']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  language: {
    type: String,
    default: 'English',
    trim: true,
    maxlength: [50, 'Language cannot exceed 50 characters']
  },
  totalCopies: {
    type: Number,
    required: [true, 'Total copies is required'],
    min: [1, 'Total copies must be at least 1']
  },
  availableCopies: {
    type: Number,
    required: [true, 'Available copies is required'],
    min: [0, 'Available copies cannot be negative']
  },
  location: {
    shelf: {
      type: String,
      trim: true,
      maxlength: [20, 'Shelf cannot exceed 20 characters']
    },
    section: {
      type: String,
      trim: true,
      maxlength: [50, 'Section cannot exceed 50 characters']
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  coverImage: {
    type: String
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  accessCount: {
    type: Number,
    default: 0,
    min: [0, 'Access count cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Virtual for issued copies
librarySchema.virtual('issuedCopies').get(function() {
  return this.totalCopies - this.availableCopies;
});

// Virtual for availability status
librarySchema.virtual('availabilityStatus').get(function() {
  if (this.availableCopies === 0) {
    return 'Not Available';
  } else if (this.availableCopies <= 2) {
    return 'Limited';
  } else {
    return 'Available';
  }
});

// Indexes
librarySchema.index({ title: 'text', author: 'text', publisher: 'text' });
librarySchema.index({ isbn: 1 });
librarySchema.index({ category: 1 });
librarySchema.index({ subject: 1 });
librarySchema.index({ classes: 1 });
librarySchema.index({ isActive: 1 });
librarySchema.index({ session: 1 });

// Validate available copies doesn't exceed total copies
librarySchema.pre('save', function(next) {
  if (this.availableCopies > this.totalCopies) {
    next(new Error('Available copies cannot exceed total copies'));
  }
  next();
});

// Static method to search books
librarySchema.statics.searchBooks = function(searchTerm, filters = {}) {
  const query = { isActive: true };
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.subject) {
    query.subject = filters.subject;
  }
  
  if (filters.class) {
    query.classes = filters.class;
  }
  
  if (filters.availableOnly) {
    query.availableCopies = { $gt: 0 };
  }
  
  return this.find(query)
    .populate('subject', 'name code')
    .populate('classes', 'name grade')
    .sort(searchTerm ? { score: { $meta: 'textScore' } } : { title: 1 });
};

// Static method to get books by class
librarySchema.statics.getByClass = function(classId, sessionId) {
  return this.find({
    classes: classId,
    session: sessionId,
    isActive: true
  })
  .populate('subject', 'name code')
  .sort({ category: 1, title: 1 });
};

// Method to increment access count
librarySchema.methods.incrementAccess = function() {
  this.accessCount += 1;
  return this.save();
};

module.exports = mongoose.model('Library', librarySchema);