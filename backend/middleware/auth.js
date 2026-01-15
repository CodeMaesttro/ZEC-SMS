const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token is not valid.'
    });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Check if user is teacher or admin
const isTeacherOrAdmin = (req, res, next) => {
  if (!req.user || !['Teacher', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher or Admin privileges required.'
    });
  }
  next();
};

// Check if user is student or their parent
const isStudentOrParent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    if (req.user.role === 'Admin' || req.user.role === 'Teacher') {
      return next();
    }
    
    if (req.user.role === 'Student') {
      const Student = require('../models/Student');
      const student = await Student.findOne({ user: req.user._id });
      
      if (!student || student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own records.'
        });
      }
    }
    
    if (req.user.role === 'Parent') {
      const Student = require('../models/Student');
      const student = await Student.findById(studentId);
      
      if (!student || student.parent?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your child\'s records.'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authorization'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
};

module.exports = {
  protect,
  authorize,
  isAdmin,
  isTeacherOrAdmin,
  isStudentOrParent,
  optionalAuth
};