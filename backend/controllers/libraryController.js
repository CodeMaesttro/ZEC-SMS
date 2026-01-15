const { validationResult } = require('express-validator');
const Library = require('../models/Library');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

// @desc    Get library books
// @route   GET /api/library
// @access  Private
const getBooks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      subject,
      class: classId,
      availableOnly,
      sortBy = 'title'
    } = req.query;

    // Build query
    let query = { isActive: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) query.category = category;
    if (subject) query.subject = subject;
    if (classId) query.classes = classId;
    if (availableOnly === 'true') query.availableCopies = { $gt: 0 };

    // Build sort
    let sort = {};
    if (search) {
      sort.score = { $meta: 'textScore' };
    } else {
      switch (sortBy) {
        case 'title':
          sort.title = 1;
          break;
        case 'author':
          sort.author = 1;
          break;
        case 'category':
          sort.category = 1;
          break;
        case 'newest':
          sort.createdAt = -1;
          break;
        default:
          sort.title = 1;
      }
    }

    // Execute query with pagination
    const books = await Library.find(query)
      .populate('subject', 'name code')
      .populate('classes', 'name grade')
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Library.countDocuments(query);

    res.json({
      success: true,
      data: {
        books,
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
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching books'
    });
  }
};

// @desc    Get single book
// @route   GET /api/library/:id
// @access  Private
const getBook = async (req, res) => {
  try {
    const book = await Library.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('classes', 'name grade')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Increment access count
    await book.incrementAccess();

    res.json({
      success: true,
      data: { book }
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching book'
    });
  }
};

// @desc    Add new book
// @route   POST /api/library
// @access  Private (Admin, Librarian)
const addBook = async (req, res) => {
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
      author,
      isbn,
      publisher,
      publicationYear,
      edition,
      category,
      subject,
      classes,
      language,
      totalCopies,
      location,
      description,
      price
    } = req.body;

    // Check if book with same ISBN already exists
    if (isbn) {
      const existingBook = await Library.findOne({ isbn, isActive: true });
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: 'Book with this ISBN already exists'
        });
      }
    }

    // Create book
    const book = await Library.create({
      title,
      author,
      isbn,
      publisher,
      publicationYear,
      edition,
      category,
      subject,
      classes: classes || [],
      language,
      totalCopies,
      availableCopies: totalCopies, // Initially all copies are available
      location,
      description,
      price,
      addedBy: req.user._id,
      createdBy: req.user._id,
      session: req.user.session
    });

    // Populate the response
    await book.populate([
      { path: 'subject', select: 'name code' },
      { path: 'classes', select: 'name grade' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: { book }
    });
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding book'
    });
  }
};

// @desc    Update book
// @route   PUT /api/library/:id
// @access  Private (Admin, Librarian)
const updateBook = async (req, res) => {
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

    const book = await Library.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const {
      title,
      author,
      isbn,
      publisher,
      publicationYear,
      edition,
      category,
      subject,
      classes,
      language,
      totalCopies,
      location,
      description,
      price
    } = req.body;

    // Check if ISBN is being changed and if it conflicts
    if (isbn && isbn !== book.isbn) {
      const existingBook = await Library.findOne({ 
        isbn, 
        isActive: true, 
        _id: { $ne: book._id } 
      });
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: 'Book with this ISBN already exists'
        });
      }
    }

    // Calculate new available copies if total copies changed
    let availableCopies = book.availableCopies;
    if (totalCopies !== undefined && totalCopies !== book.totalCopies) {
      const issuedCopies = book.totalCopies - book.availableCopies;
      availableCopies = Math.max(0, totalCopies - issuedCopies);
    }

    // Update book
    const updatedBook = await Library.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        isbn,
        publisher,
        publicationYear,
        edition,
        category,
        subject,
        classes: classes || [],
        language,
        totalCopies,
        availableCopies,
        location,
        description,
        price,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'subject', select: 'name code' },
      { path: 'classes', select: 'name grade' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'updatedBy', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: { book: updatedBook }
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating book'
    });
  }
};

// @desc    Delete book
// @route   DELETE /api/library/:id
// @access  Private (Admin, Librarian)
const deleteBook = async (req, res) => {
  try {
    const book = await Library.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book has issued copies
    if (book.availableCopies < book.totalCopies) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book with issued copies. Please return all copies first.'
      });
    }

    // Soft delete
    book.isActive = false;
    book.updatedBy = req.user._id;
    await book.save();

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting book'
    });
  }
};

// @desc    Issue book
// @route   POST /api/library/:id/issue
// @access  Private (Admin, Librarian)
const issueBook = async (req, res) => {
  try {
    const { studentId, dueDate, remarks } = req.body;

    const book = await Library.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for issue'
      });
    }

    // Update available copies
    book.availableCopies -= 1;
    await book.save();

    // Here you would typically create a BookIssue record
    // For now, we'll just return success

    res.json({
      success: true,
      message: 'Book issued successfully',
      data: {
        book: {
          _id: book._id,
          title: book.title,
          availableCopies: book.availableCopies,
          totalCopies: book.totalCopies
        }
      }
    });
  } catch (error) {
    console.error('Issue book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while issuing book'
    });
  }
};

// @desc    Return book
// @route   POST /api/library/:id/return
// @access  Private (Admin, Librarian)
const returnBook = async (req, res) => {
  try {
    const { studentId, returnDate, condition, remarks } = req.body;

    const book = await Library.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (book.availableCopies >= book.totalCopies) {
      return res.status(400).json({
        success: false,
        message: 'All copies are already available'
      });
    }

    // Update available copies
    book.availableCopies += 1;
    await book.save();

    // Here you would typically update the BookIssue record
    // For now, we'll just return success

    res.json({
      success: true,
      message: 'Book returned successfully',
      data: {
        book: {
          _id: book._id,
          title: book.title,
          availableCopies: book.availableCopies,
          totalCopies: book.totalCopies
        }
      }
    });
  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while returning book'
    });
  }
};

// @desc    Get library statistics
// @route   GET /api/library/stats
// @access  Private (Admin, Librarian)
const getLibraryStats = async (req, res) => {
  try {
    // Basic statistics
    const totalBooks = await Library.countDocuments({ isActive: true });
    const totalCopies = await Library.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalCopies' } } }
    ]);

    const availableCopies = await Library.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$availableCopies' } } }
    ]);

    // Category wise distribution
    const categoryStats = await Library.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Most accessed books
    const popularBooks = await Library.find({ isActive: true })
      .sort({ accessCount: -1 })
      .limit(10)
      .select('title author accessCount category')
      .populate('subject', 'name');

    // Recent additions
    const recentBooks = await Library.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title author category createdAt')
      .populate('createdBy', 'firstName lastName');

    const stats = {
      summary: {
        totalBooks,
        totalCopies: totalCopies[0]?.total || 0,
        availableCopies: availableCopies[0]?.total || 0,
        issuedCopies: (totalCopies[0]?.total || 0) - (availableCopies[0]?.total || 0)
      },
      categoryStats,
      popularBooks,
      recentBooks
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get library stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching library statistics'
    });
  }
};

// @desc    Search books
// @route   GET /api/library/search
// @access  Private
const searchBooks = async (req, res) => {
  try {
    const { q: searchTerm, category, subject, class: classId, availableOnly } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const filters = {};
    if (category) filters.category = category;
    if (subject) filters.subject = subject;
    if (classId) filters.class = classId;
    if (availableOnly === 'true') filters.availableOnly = true;

    const books = await Library.searchBooks(searchTerm, filters);

    res.json({
      success: true,
      data: { books }
    });
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching books'
    });
  }
};

module.exports = {
  getBooks,
  getBook,
  addBook,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getLibraryStats,
  searchBooks
};