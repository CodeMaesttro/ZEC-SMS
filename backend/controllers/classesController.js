const { validationResult } = require('express-validator');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private (Admin, Teacher)
const getClasses = async (req, res) => {
  try {
    const { session, includeStats = false } = req.query;

    let query = {};
    if (session) {
      query.session = session;
    }

    const classes = await Class.find(query)
      .populate('classTeacher', 'firstName lastName email')
      .populate('session', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ grade: 1, name: 1 });

    // Include statistics if requested
    if (includeStats === 'true') {
      for (let classItem of classes) {
        const studentCount = await Student.countDocuments({
          class: classItem._id,
          status: 'Active'
        });
        
        const sectionCount = await Section.countDocuments({
          class: classItem._id
        });

        classItem._doc.stats = {
          studentCount,
          sectionCount
        };
      }
    }

    res.json({
      success: true,
      data: { classes }
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching classes'
    });
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private (Admin, Teacher)
const getClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('classTeacher', 'firstName lastName email phone')
      .populate('session', 'name startDate endDate')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get sections for this class
    const sections = await Section.find({ class: classItem._id })
      .populate('classTeacher', 'firstName lastName');

    // Get subjects for this class
    const subjects = await Subject.find({ classes: classItem._id })
      .populate('teacher', 'firstName lastName');

    // Get student statistics
    const studentStats = await Student.aggregate([
      { $match: { class: classItem._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      totalStudents: await Student.countDocuments({ class: classItem._id }),
      activeStudents: studentStats.find(s => s._id === 'Active')?.count || 0,
      totalSections: sections.length,
      totalSubjects: subjects.length
    };

    res.json({
      success: true,
      data: {
        class: classItem,
        sections,
        subjects,
        stats
      }
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class'
    });
  }
};

// @desc    Create new class
// @route   POST /api/classes
// @access  Private (Admin)
const createClass = async (req, res) => {
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
      grade,
      capacity,
      classTeacher,
      session,
      description,
      subjects
    } = req.body;

    // Check if class already exists for this session
    const existingClass = await Class.findOne({
      name,
      grade,
      session
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: 'Class with this name and grade already exists for this session'
      });
    }

    // Create class
    const classItem = await Class.create({
      name,
      grade,
      capacity,
      classTeacher,
      session,
      description,
      createdBy: req.user._id
    });

    // If subjects are provided, update them to include this class
    if (subjects && subjects.length > 0) {
      await Subject.updateMany(
        { _id: { $in: subjects } },
        { $addToSet: { classes: classItem._id } }
      );
    }

    // Populate the response
    await classItem.populate([
      { path: 'classTeacher', select: 'firstName lastName email' },
      { path: 'session', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: { class: classItem }
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating class'
    });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private (Admin)
const updateClass = async (req, res) => {
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

    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const {
      name,
      grade,
      capacity,
      classTeacher,
      description,
      subjects
    } = req.body;

    // Check if updated name/grade conflicts with existing class
    if (name !== classItem.name || grade !== classItem.grade) {
      const existingClass = await Class.findOne({
        _id: { $ne: req.params.id },
        name,
        grade,
        session: classItem.session
      });

      if (existingClass) {
        return res.status(400).json({
          success: false,
          message: 'Class with this name and grade already exists for this session'
        });
      }
    }

    // Update class
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      {
        name,
        grade,
        capacity,
        classTeacher,
        description,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'classTeacher', select: 'firstName lastName email' },
      { path: 'session', select: 'name' }
    ]);

    // Update subjects if provided
    if (subjects && Array.isArray(subjects)) {
      // Remove this class from all subjects first
      await Subject.updateMany(
        { classes: classItem._id },
        { $pull: { classes: classItem._id } }
      );

      // Add this class to selected subjects
      if (subjects.length > 0) {
        await Subject.updateMany(
          { _id: { $in: subjects } },
          { $addToSet: { classes: classItem._id } }
        );
      }
    }

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: { class: updatedClass }
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating class'
    });
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private (Admin)
const deleteClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if class has active students
    const activeStudents = await Student.countDocuments({
      class: req.params.id,
      status: 'Active'
    });

    if (activeStudents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class. It has ${activeStudents} active students.`
      });
    }

    // Remove class from subjects
    await Subject.updateMany(
      { classes: req.params.id },
      { $pull: { classes: req.params.id } }
    );

    // Delete associated sections
    await Section.deleteMany({ class: req.params.id });

    // Delete the class
    await Class.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting class'
    });
  }
};

// @desc    Get class students
// @route   GET /api/classes/:id/students
// @access  Private (Admin, Teacher)
const getClassStudents = async (req, res) => {
  try {
    const { section, status = 'Active' } = req.query;

    let query = {
      class: req.params.id,
      status
    };

    if (section) {
      query.section = section;
    }

    const students = await Student.find(query)
      .populate('user', 'firstName lastName email phone profileImage')
      .populate('section', 'name')
      .populate('parent', 'firstName lastName phone')
      .sort({ rollNumber: 1, 'user.firstName': 1 });

    res.json({
      success: true,
      data: { students }
    });
  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class students'
    });
  }
};

// @desc    Get class statistics
// @route   GET /api/classes/stats
// @access  Private (Admin, Teacher)
const getClassStats = async (req, res) => {
  try {
    const { session } = req.query;
    let matchQuery = {};
    
    if (session) {
      matchQuery.session = mongoose.Types.ObjectId(session);
    }

    const stats = await Class.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: 'class',
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'sections',
          localField: '_id',
          foreignField: 'class',
          as: 'sections'
        }
      },
      {
        $project: {
          name: 1,
          grade: 1,
          capacity: 1,
          totalStudents: { $size: '$students' },
          activeStudents: {
            $size: {
              $filter: {
                input: '$students',
                cond: { $eq: ['$$this.status', 'Active'] }
              }
            }
          },
          totalSections: { $size: '$sections' },
          utilizationRate: {
            $multiply: [
              {
                $divide: [
                  { $size: '$students' },
                  { $ifNull: ['$capacity', 1] }
                ]
              },
              100
            ]
          }
        }
      },
      { $sort: { grade: 1, name: 1 } }
    ]);

    const summary = await Class.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: 'class',
          as: 'students'
        }
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalStudents: { $sum: { $size: '$students' } },
          totalActiveStudents: {
            $sum: {
              $size: {
                $filter: {
                  input: '$students',
                  cond: { $eq: ['$$this.status', 'Active'] }
                }
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: summary[0] || {
          totalClasses: 0,
          totalCapacity: 0,
          totalStudents: 0,
          totalActiveStudents: 0
        },
        classWise: stats
      }
    });
  } catch (error) {
    console.error('Get class stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class statistics'
    });
  }
};

module.exports = {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  getClassStudents,
  getClassStats
};