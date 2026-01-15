const { validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const ExamMark = require('../models/ExamMark');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const mongoose = require('mongoose');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private (Admin, Teacher, Student)
const getExams = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      class: classId,
      subject: subjectId,
      examType,
      status,
      session
    } = req.query;

    // Build query based on user role
    let query = {};

    // Role-based filtering
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        query.class = student.class;
      }
    } else if (req.user.role === 'Teacher') {
      // Teachers can see exams for their assigned classes/subjects
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (teacher) {
        const assignedClassIds = teacher.assignedClasses.map(ac => ac.class);
        const assignedSubjectIds = teacher.assignedSubjects.map(as => as.subject);
        query.$or = [
          { class: { $in: assignedClassIds } },
          { subject: { $in: assignedSubjectIds } },
          { teacher: req.user._id }
        ];
      }
    }

    if (search) {
      query.$or = [
        ...(query.$or || []),
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (classId) query.class = classId;
    if (subjectId) query.subject = subjectId;
    if (examType) query.examType = examType;
    if (status) query.status = status;
    if (session) query.session = session;

    // Execute query with pagination
    const exams = await Exam.find(query)
      .populate('class', 'name grade')
      .populate('subject', 'name code')
      .populate('examType', 'name')
      .populate('teacher', 'firstName lastName')
      .populate('session', 'name')
      .sort({ examDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exam.countDocuments(query);

    res.json({
      success: true,
      data: {
        exams,
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
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exams'
    });
  }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private (Admin, Teacher, Student)
const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('class', 'name grade capacity')
      .populate('subject', 'name code totalMarks passMarks')
      .populate('examType', 'name description')
      .populate('teacher', 'firstName lastName email')
      .populate('session', 'name startDate endDate')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || student.class.toString() !== exam.class._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view exams for your class.'
        });
      }
    }

    // Get exam statistics
    const stats = {
      totalStudents: 0,
      marksEntered: 0,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 0,
      passCount: 0,
      failCount: 0
    };

    if (exam.class) {
      stats.totalStudents = await Student.countDocuments({
        class: exam.class._id,
        status: 'Active'
      });

      const marks = await ExamMark.find({ exam: exam._id });
      stats.marksEntered = marks.length;

      if (marks.length > 0) {
        const marksArray = marks.map(m => m.marksObtained);
        stats.averageMarks = Math.round(marksArray.reduce((sum, mark) => sum + mark, 0) / marks.length);
        stats.highestMarks = Math.max(...marksArray);
        stats.lowestMarks = Math.min(...marksArray);
        stats.passCount = marks.filter(m => m.marksObtained >= (exam.passMarks || exam.subject?.passMarks || 0)).length;
        stats.failCount = marks.length - stats.passCount;
      }
    }

    res.json({
      success: true,
      data: {
        exam,
        stats
      }
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam'
    });
  }
};

// @desc    Create new exam
// @route   POST /api/exams
// @access  Private (Admin, Teacher)
const createExam = async (req, res) => {
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
      name,
      description,
      class: classId,
      subject: subjectId,
      examType,
      examDate,
      startTime,
      endTime,
      duration,
      totalMarks,
      passMarks,
      instructions,
      session,
      teacher
    } = req.body;

    // Validate exam date is not in the past
    if (new Date(examDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Exam date cannot be in the past'
      });
    }

    // Validate start time is before end time
    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Check for conflicting exams
    const conflictingExam = await Exam.findOne({
      class: classId,
      examDate: new Date(examDate),
      $or: [
        {
          startTime: { $lte: startTime },
          endTime: { $gte: startTime }
        },
        {
          startTime: { $lte: endTime },
          endTime: { $gte: endTime }
        },
        {
          startTime: { $gte: startTime },
          endTime: { $lte: endTime }
        }
      ],
      status: { $ne: 'Cancelled' }
    });

    if (conflictingExam) {
      return res.status(400).json({
        success: false,
        message: 'There is already an exam scheduled for this class at the same time'
      });
    }

    // Create exam
    const exam = await Exam.create({
      name,
      description,
      class: classId,
      subject: subjectId,
      examType,
      examDate: new Date(examDate),
      startTime,
      endTime,
      duration,
      totalMarks,
      passMarks,
      instructions: instructions || [],
      session: session || req.user.session,
      teacher: teacher || req.user._id,
      createdBy: req.user._id
    });

    // Populate the response
    await exam.populate([
      { path: 'class', select: 'name grade' },
      { path: 'subject', select: 'name code' },
      { path: 'examType', select: 'name' },
      { path: 'teacher', select: 'firstName lastName' },
      { path: 'session', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { exam }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating exam'
    });
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (Admin, Teacher-own)
const updateExam = async (req, res) => {
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

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Teacher' && exam.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own exams.'
      });
    }

    // Check if exam has already started
    const now = new Date();
    const examDateTime = new Date(`${exam.examDate.toDateString()} ${exam.startTime}`);
    
    if (examDateTime <= now && exam.status === 'Scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update exam that has already started'
      });
    }

    const {
      name,
      description,
      examDate,
      startTime,
      endTime,
      duration,
      totalMarks,
      passMarks,
      instructions,
      status
    } = req.body;

    // Validate exam date if provided
    if (examDate && new Date(examDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Exam date cannot be in the past'
      });
    }

    // Update exam
    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        examDate: examDate ? new Date(examDate) : exam.examDate,
        startTime,
        endTime,
        duration,
        totalMarks,
        passMarks,
        instructions,
        status,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'class', select: 'name grade' },
      { path: 'subject', select: 'name code' },
      { path: 'examType', select: 'name' },
      { path: 'teacher', select: 'firstName lastName' },
      { path: 'session', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: { exam: updatedExam }
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating exam'
    });
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private (Admin)
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if exam has marks entered
    const marksCount = await ExamMark.countDocuments({ exam: req.params.id });
    if (marksCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam. It has ${marksCount} mark entries. Please remove marks first.`
      });
    }

    // Soft delete - set status to cancelled
    await Exam.findByIdAndUpdate(req.params.id, {
      status: 'Cancelled',
      updatedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting exam'
    });
  }
};

// @desc    Get exam results
// @route   GET /api/exams/:id/results
// @access  Private (Admin, Teacher, Student-own)
const getExamResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('class', 'name grade')
      .populate('subject', 'name code');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || student.class.toString() !== exam.class._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view results for your class.'
        });
      }
    }

    let query = { exam: req.params.id };

    // If student, only show their own result
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        query.student = student._id;
      }
    }

    const results = await ExamMark.find(query)
      .populate('student', 'admissionNumber rollNumber')
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .sort({ marksObtained: -1 });

    // Calculate statistics
    const stats = {
      totalStudents: results.length,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 0,
      passCount: 0,
      failCount: 0,
      passPercentage: 0
    };

    if (results.length > 0) {
      const marksArray = results.map(r => r.marksObtained);
      stats.averageMarks = Math.round(marksArray.reduce((sum, mark) => sum + mark, 0) / results.length);
      stats.highestMarks = Math.max(...marksArray);
      stats.lowestMarks = Math.min(...marksArray);
      stats.passCount = results.filter(r => r.marksObtained >= (exam.passMarks || 0)).length;
      stats.failCount = results.length - stats.passCount;
      stats.passPercentage = Math.round((stats.passCount / results.length) * 100);
    }

    res.json({
      success: true,
      data: {
        exam,
        results,
        stats
      }
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam results'
    });
  }
};

// @desc    Publish exam results
// @route   POST /api/exams/:id/publish
// @access  Private (Admin, Teacher-own)
const publishResults = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Teacher' && exam.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only publish results for your own exams.'
      });
    }

    // Check if all marks are entered
    const totalStudents = await Student.countDocuments({
      class: exam.class,
      status: 'Active'
    });

    const marksEntered = await ExamMark.countDocuments({ exam: req.params.id });

    if (marksEntered < totalStudents) {
      return res.status(400).json({
        success: false,
        message: `Cannot publish results. Marks entered for ${marksEntered} out of ${totalStudents} students.`
      });
    }

    // Update exam status
    await Exam.findByIdAndUpdate(req.params.id, {
      status: 'Completed',
      resultsPublished: true,
      resultsPublishedAt: new Date(),
      updatedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Exam results published successfully'
    });
  } catch (error) {
    console.error('Publish results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while publishing results'
    });
  }
};

// @desc    Get exam statistics
// @route   GET /api/exams/stats
// @access  Private (Admin, Teacher)
const getExamStats = async (req, res) => {
  try {
    const { session } = req.query;
    let matchQuery = {};
    
    if (session) {
      matchQuery.session = mongoose.Types.ObjectId(session);
    }

    // Role-based filtering
    if (req.user.role === 'Teacher') {
      matchQuery.teacher = req.user._id;
    }

    const stats = await Exam.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await Exam.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$examDate' },
            month: { $month: '$examDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const summary = {
      total: await Exam.countDocuments(matchQuery),
      scheduled: stats.find(s => s._id === 'Scheduled')?.count || 0,
      ongoing: stats.find(s => s._id === 'Ongoing')?.count || 0,
      completed: stats.find(s => s._id === 'Completed')?.count || 0,
      cancelled: stats.find(s => s._id === 'Cancelled')?.count || 0
    };

    res.json({
      success: true,
      data: {
        summary,
        statusWise: stats,
        monthly: monthlyStats
      }
    });
  } catch (error) {
    console.error('Get exam stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam statistics'
    });
  }
};

module.exports = {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  getExamResults,
  publishResults,
  getExamStats
};