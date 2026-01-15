const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin, Teacher)
const getStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      class: classId,
      section: sectionId,
      session,
      status = 'Active'
    } = req.query;

    // Build query
    let query = { status };

    if (search) {
      query.$or = [
        { admissionNumber: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;
    if (session) query.session = session;

    // Execute query with pagination
    const students = await Student.find(query)
      .populate('user', 'firstName lastName email phone profileImage')
      .populate('class', 'name grade')
      .populate('section', 'name')
      .populate('session', 'name')
      .populate('parent', 'firstName lastName email phone')
      .sort({ admissionNumber: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private (Admin, Teacher, Student-own, Parent-own)
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'firstName lastName email phone dateOfBirth gender address profileImage')
      .populate('class', 'name grade')
      .populate('section', 'name')
      .populate('session', 'name')
      .populate('parent', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Student' && student.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    if (req.user.role === 'Parent' && student.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your child\'s profile.'
      });
    }

    res.json({
      success: true,
      data: { student }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student'
    });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin)
const createStudent = async (req, res) => {
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
      // User details
      firstName,
      lastName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      address,
      // Student specific
      admissionNumber,
      rollNumber,
      class: classId,
      section: sectionId,
      session,
      admissionDate,
      bloodGroup,
      religion,
      caste,
      category,
      // Parent details
      parentId,
      // Emergency contact
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      // Transport
      transportRoute,
      pickupPoint,
      // Hostel
      hostelRequired,
      hostelRoom,
      // Medical
      medicalConditions,
      allergies,
      // Previous school
      previousSchool,
      previousClass,
      tcNumber,
      tcDate
    } = req.body;

    // Check if admission number already exists
    const existingStudent = await Student.findOne({ admissionNumber });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this admission number already exists'
      });
    }

    // Create user account first
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role: 'Student',
      phone,
      dateOfBirth,
      gender,
      address,
      createdBy: req.user._id
    });

    // Create student record
    const student = await Student.create({
      user: user._id,
      admissionNumber,
      rollNumber,
      class: classId,
      section: sectionId,
      session,
      admissionDate,
      bloodGroup,
      religion,
      caste,
      category,
      parent: parentId,
      emergencyContact: {
        name: emergencyContactName,
        phone: emergencyContactPhone,
        relation: emergencyContactRelation
      },
      transport: {
        route: transportRoute,
        pickupPoint
      },
      hostel: {
        required: hostelRequired,
        room: hostelRoom
      },
      medical: {
        conditions: medicalConditions,
        allergies
      },
      previousEducation: {
        school: previousSchool,
        class: previousClass,
        tcNumber,
        tcDate
      },
      createdBy: req.user._id
    });

    // Populate the response
    await student.populate([
      { path: 'user', select: 'firstName lastName email phone' },
      { path: 'class', select: 'name grade' },
      { path: 'section', select: 'name' },
      { path: 'session', select: 'name' },
      { path: 'parent', select: 'firstName lastName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: { student }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating student'
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin)
const updateStudent = async (req, res) => {
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

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const {
      // User details
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      // Student specific
      rollNumber,
      class: classId,
      section: sectionId,
      bloodGroup,
      religion,
      caste,
      category,
      status,
      // Parent details
      parentId,
      // Emergency contact
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      // Transport
      transportRoute,
      pickupPoint,
      // Hostel
      hostelRequired,
      hostelRoom,
      // Medical
      medicalConditions,
      allergies
    } = req.body;

    // Update user details
    await User.findByIdAndUpdate(student.user, {
      firstName,
      lastName,
      email: email?.toLowerCase(),
      phone,
      dateOfBirth,
      gender,
      address,
      updatedBy: req.user._id
    });

    // Update student details
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        rollNumber,
        class: classId,
        section: sectionId,
        bloodGroup,
        religion,
        caste,
        category,
        status,
        parent: parentId,
        emergencyContact: {
          name: emergencyContactName,
          phone: emergencyContactPhone,
          relation: emergencyContactRelation
        },
        transport: {
          route: transportRoute,
          pickupPoint
        },
        hostel: {
          required: hostelRequired,
          room: hostelRoom
        },
        medical: {
          conditions: medicalConditions,
          allergies
        },
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'user', select: 'firstName lastName email phone' },
      { path: 'class', select: 'name grade' },
      { path: 'section', select: 'name' },
      { path: 'session', select: 'name' },
      { path: 'parent', select: 'firstName lastName email phone' }
    ]);

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: { student: updatedStudent }
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Soft delete - change status to Inactive
    await Student.findByIdAndUpdate(req.params.id, {
      status: 'Inactive',
      updatedBy: req.user._id
    });

    // Also deactivate user account
    await User.findByIdAndUpdate(student.user, {
      isActive: false,
      updatedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting student'
    });
  }
};

// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private (Admin, Teacher)
const getStudentStats = async (req, res) => {
  try {
    const { session } = req.query;
    let matchQuery = {};
    
    if (session) {
      matchQuery.session = mongoose.Types.ObjectId(session);
    }

    const stats = await Student.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
          graduated: { $sum: { $cond: [{ $eq: ['$status', 'Graduated'] }, 1, 0] } },
          transferred: { $sum: { $cond: [{ $eq: ['$status', 'Transferred'] }, 1, 0] } }
        }
      }
    ]);

    const classWiseStats = await Student.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $group: {
          _id: '$class',
          className: { $first: '$classInfo.name' },
          grade: { $first: '$classInfo.grade' },
          count: { $sum: 1 }
        }
      },
      { $sort: { grade: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          active: 0,
          inactive: 0,
          graduated: 0,
          transferred: 0
        },
        classWise: classWiseStats
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student statistics'
    });
  }
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats
};