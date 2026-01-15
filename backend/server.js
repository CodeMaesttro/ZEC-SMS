const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const sectionRoutes = require('./routes/sections');
const subjectRoutes = require('./routes/subjects');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const examRoutes = require('./routes/exams');
const markRoutes = require('./routes/marks');
const attendanceRoutes = require('./routes/attendance');
const feeRoutes = require('./routes/fees');
const libraryRoutes = require('./routes/library');
const studyMaterialRoutes = require('./routes/studyMaterials');
const messageRoutes = require('./routes/messages');
const noticeRoutes = require('./routes/notices');
const reportRoutes = require('./routes/reports');
const sessionRoutes = require('./routes/sessions');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { protect } = require('./middleware/auth');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/classes', protect, classRoutes);
app.use('/api/sections', protect, sectionRoutes);
app.use('/api/subjects', protect, subjectRoutes);
app.use('/api/students', protect, studentRoutes);
app.use('/api/teachers', protect, teacherRoutes);
app.use('/api/exams', protect, examRoutes);
app.use('/api/marks', protect, markRoutes);
app.use('/api/attendance', protect, attendanceRoutes);
app.use('/api/fees', protect, feeRoutes);
app.use('/api/library', protect, libraryRoutes);
app.use('/api/study-materials', protect, studyMaterialRoutes);
app.use('/api/messages', protect, messageRoutes);
app.use('/api/notices', protect, noticeRoutes);
app.use('/api/reports', protect, reportRoutes);
app.use('/api/sessions', protect, sessionRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'School Management System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;