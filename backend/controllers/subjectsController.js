const { validationResult } = require('express-validator');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private (Admin, Teacher, Student)
const getSubjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      class: classId,
      teacher: teacherId,
      type,
      status = 'Active'
    } = req.query;

    // Build query
    let query = { status };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (classId) query.classes = classId;
    if (teacherId) query.teacher = teacherId;
    if (type) query.type = type;

    // Execute query with pagination
    const subjects = await Subject.find(query)
      .populate('teacher', 'firstName lastName email employeeId')
      .populate('classes', 'name grade')
      .populate('session', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subject.countDocuments(query);

    res.json({
      success: true,
      data: {
        subjects,
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
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subjects'
    });
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private (Admin, Teacher, Student)
const getSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('teacher', 'firstName lastName email phone employeeId department')
      .populate('classes', 'name grade capacity')
      .populate('session', 'name startDate endDate')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Get additional statistics
    const stats = {
      totalClasses: subject.classes.length,
      totalStudents: 0, // Will be calculated from classes
      hasTeacher: !!subject.teacher
    };

    // Calculate total students in all classes for this subject
    if (subject.classes.length > 0) {
      const Student = require('../models/Student');
      stats.totalStudents = await Student.countDocuments({
        class: { $in: subject.classes.map(c => c._id) },
        status: 'Active'
      });
    }

    res.json({
      success: true,
      data: {
        subject,
        stats
      }
    });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subject'
    });
  }
};

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private (Admin)
const createSubject = async (req, res) => {
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
      code,
      description,
      type,
      credits,
      totalMarks,
      passMarks,
      teacher,
      classes,
      session,
      syllabus,
      books,
      isOptional,
      prerequisites
    } = req.body;

    // Check if subject with same code already exists
    const existingSubject = await Subject.findOne({ 
      code: code.toUpperCase(),
      session: session || req.user.session 
    });
    
    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Subject with this code already exists for this session'
      });
    }

    // Create subject
    const subject = await Subject.create({
      name,
      code: code.toUpperCase(),
      description,
      type,
      credits,
      totalMarks,
      passMarks,
      teacher,
      classes: classes || [],
      session: session || req.user.session,
      syllabus,
      books: books || [],
      isOptional: isOptional || false,
      prerequisites: prerequisites || [],
      createdBy: req.user._id
    });

    // Update teacher's assigned subjects if teacher is assigned
    if (teacher) {
      await Teacher.findOneAndUpdate(
        { user: teacher },
        {
          $addToSet: {
            assignedSubjects: {
              subject: subject._id,
              classes: classes || []
            }
          }
        }
      );
    }

    // Populate the response
    await subject.populate([
      { path: 'teacher', select: 'firstName lastName email employeeId' },
      { path: 'classes', select: 'name grade' },
      { path: 'session', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: { subject }
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating subject'
    });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin)
const updateSubject = async (req, res) => {
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

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    const {
      name,
      code,
      description,
      type,
      credits,
      totalMarks,
      passMarks,
      teacher,
      classes,
      syllabus,
      books,
      isOptional,
      prerequisites,
      status
    } = req.body;

    // Check if updated code conflicts with existing subject
    if (code && code.toUpperCase() !== subject.code) {
      const existingSubject = await Subject.findOne({
        _id: { $ne: req.params.id },
        code: code.toUpperCase(),
        session: subject.session
      });

      if (existingSubject) {
        return res.status(400).json({
          success: false,
          message: 'Subject with this code already exists for this session'
        });
      }
    }

    // Update teacher assignments if teacher changed
    if (teacher !== subject.teacher?.toString()) {
      // Remove from old teacher
      if (subject.teacher) {
        await Teacher.findOneAndUpdate(
          { user: subject.teacher },
          {
            $pull: {
              assignedSubjects: { subject: subject._id }
            }
          }
        );
      }

      // Add to new teacher
      if (teacher) {
        await Teacher.findOneAndUpdate(
          { user: teacher },
          {
            $addToSet: {
              assignedSubjects: {
                subject: subject._id,
                classes: classes || subject.classes
              }
            }
          }
        );
      }
    }

    // Update subject
    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        name,
        code: code?.toUpperCase(),
        description,
        type,
        credits,
        totalMarks,
        passMarks,
        teacher,
        classes,
        syllabus,
        books,
        isOptional,
        prerequisites,
        status,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'teacher', select: 'firstName lastName email employeeId' },
      { path: 'classes', select: 'name grade' },
      { path: 'session', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: { subject: updatedSubject }
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating subject'
    });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin)
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if subject has any exams or marks
    const Exam = require('../models/Exam');
    const ExamMark = require('../models/ExamMark');
    
    const hasExams = await Exam.countDocuments({ subject: req.params.id });
    const hasMarks = await ExamMark.countDocuments({ subject: req.params.id });

    if (hasExams > 0 || hasMarks > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete subject. It has ${hasExams} exams and ${hasMarks} mark entries. Please remove them first.`
      });
    }

    // Remove from teacher assignments
    if (subject.teacher) {
      await Teacher.findOneAndUpdate(
        { user: subject.teacher },
        {
          $pull: {
            assignedSubjects: { subject: subject._id }
          }
        }
      );
    }

    // Soft delete - set status to inactive
    await Subject.findByIdAndUpdate(req.params.id, {
      status: 'Inactive',
      updatedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting subject'
    });
  }
};

// @desc    Assign classes to subject
// @route   POST /api/subjects/:id/assign-classes
// @access  Private (Admin)
const assignClasses = async (req, res) => {
  try {
    const { classIds } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Verify all classes exist
    const classes = await Class.find({ _id: { $in: classIds } });
    if (classes.length !== classIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more classes not found'
      });
    }

    // Update subject with new classes
    subject.classes = classIds;
    await subject.save();

    // Update teacher assignment if teacher is assigned
    if (subject.teacher) {
      await Teacher.findOneAndUpdate(
        { user: subject.teacher, 'assignedSubjects.subject': subject._id },
        {
          $set: {
            'assignedSubjects.$.classes': classIds
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Classes assigned successfully'
    });
  } catch (error) {
    console.error('Assign classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning classes'
    });
  }
};

// @desc    Get subject statistics
// @route   GET /api/subjects/stats
// @access  Private (Admin)
const getSubjectStats = async (req, res) => {
  try {
    const { session } = req.query;
    let matchQuery = {};
    
    if (session) {
      matchQuery.session = mongoose.Types.ObjectId(session);
    }

    const stats = await Subject.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = await Subject.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const teacherStats = await Subject.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          withTeacher: { $sum: { $cond: [{ $ne: ['$teacher', null] }, 1, 0] } },
          withoutTeacher: { $sum: { $cond: [{ $eq: ['$teacher', null] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      total: await Subject.countDocuments(matchQuery),
      active: statusStats.find(s => s._id === 'Active')?.count || 0,
      inactive: statusStats.find(s => s._id === 'Inactive')?.count || 0,
      withTeacher: teacherStats[0]?.withTeacher || 0,
      withoutTeacher: teacherStats[0]?.withoutTeacher || 0
    };

    res.json({
      success: true,
      data: {
        summary,
        typeWise: stats,
        statusWise: statusStats
      }
    });
  } catch (error) {
    console.error('Get subject stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subject statistics'
    });
  }
};

module.exports = {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  assignClasses,
  getSubjectStats
};