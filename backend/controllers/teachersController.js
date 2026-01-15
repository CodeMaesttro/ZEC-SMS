const { validationResult } = require('express-validator');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private (Admin, Teacher)
const getTeachers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      qualification,
      status = 'Active'
    } = req.query;

    // Build query
    let query = { status };

    if (search) {
      // Search in user fields and teacher fields
      const userIds = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { user: { $in: userIds.map(u => u._id) } }
      ];
    }

    if (department) query.department = department;
    if (qualification) query.qualification = qualification;

    // Execute query with pagination
    const teachers = await Teacher.find(query)
      .populate('user', 'firstName lastName email phone profileImage dateOfBirth gender')
      .populate('assignedClasses.class', 'name grade')
      .populate('assignedClasses.section', 'name')
      .populate('assignedSubjects.subject', 'name code')
      .populate('assignedSubjects.classes', 'name grade')
      .populate('session', 'name')
      .sort({ employeeId: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Teacher.countDocuments(query);

    res.json({
      success: true,
      data: {
        teachers,
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
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teachers'
    });
  }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Private (Admin, Teacher)
const getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('user', 'firstName lastName email phone profileImage dateOfBirth gender address')
      .populate('assignedClasses.class', 'name grade capacity')
      .populate('assignedClasses.section', 'name')
      .populate('assignedSubjects.subject', 'name code description')
      .populate('assignedSubjects.classes', 'name grade')
      .populate('session', 'name startDate endDate')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get additional statistics
    const stats = {
      totalClasses: teacher.assignedClasses.length,
      totalSubjects: teacher.assignedSubjects.length,
      isClassTeacher: teacher.assignedClasses.some(ac => ac.isClassTeacher)
    };

    res.json({
      success: true,
      data: {
        teacher,
        stats
      }
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher'
    });
  }
};

// @desc    Create new teacher
// @route   POST /api/teachers
// @access  Private (Admin)
const createTeacher = async (req, res) => {
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
      // User fields
      firstName,
      lastName,
      email,
      password,
      phone,
      address,
      dateOfBirth,
      gender,
      profileImage,
      
      // Teacher specific fields
      employeeId,
      department,
      designation,
      qualification,
      experience,
      specialization,
      joiningDate,
      salary,
      workingHours,
      emergencyContact,
      session
    } = req.body;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if teacher with employee ID already exists
    if (employeeId) {
      const existingTeacher = await Teacher.findOne({ employeeId });
      if (existingTeacher) {
        return res.status(400).json({
          success: false,
          message: 'Teacher with this employee ID already exists'
        });
      }
    }

    // Create user first
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'Teacher',
      phone,
      address,
      dateOfBirth,
      gender,
      profileImage,
      createdBy: req.user._id
    });

    // Create teacher record
    const teacher = await Teacher.create({
      user: user._id,
      employeeId,
      department,
      designation,
      qualification,
      experience,
      specialization,
      joiningDate: joiningDate || new Date(),
      salary,
      workingHours,
      emergencyContact,
      session: session || req.user.session,
      createdBy: req.user._id
    });

    // Populate the response
    await teacher.populate([
      { path: 'user', select: 'firstName lastName email phone profileImage' },
      { path: 'session', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: { teacher }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating teacher'
    });
  }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private (Admin)
const updateTeacher = async (req, res) => {
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

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const {
      // User fields
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      profileImage,
      
      // Teacher specific fields
      employeeId,
      department,
      designation,
      qualification,
      experience,
      specialization,
      salary,
      workingHours,
      emergencyContact,
      status
    } = req.body;

    // Update user record
    const userUpdateData = {};
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (email) userUpdateData.email = email;
    if (phone) userUpdateData.phone = phone;
    if (address) userUpdateData.address = address;
    if (dateOfBirth) userUpdateData.dateOfBirth = dateOfBirth;
    if (gender) userUpdateData.gender = gender;
    if (profileImage) userUpdateData.profileImage = profileImage;
    userUpdateData.updatedBy = req.user._id;

    if (Object.keys(userUpdateData).length > 1) { // More than just updatedBy
      await User.findByIdAndUpdate(teacher.user, userUpdateData);
    }

    // Update teacher record
    const teacherUpdateData = {};
    if (employeeId) teacherUpdateData.employeeId = employeeId;
    if (department) teacherUpdateData.department = department;
    if (designation) teacherUpdateData.designation = designation;
    if (qualification) teacherUpdateData.qualification = qualification;
    if (experience) teacherUpdateData.experience = experience;
    if (specialization) teacherUpdateData.specialization = specialization;
    if (salary) teacherUpdateData.salary = salary;
    if (workingHours) teacherUpdateData.workingHours = workingHours;
    if (emergencyContact) teacherUpdateData.emergencyContact = emergencyContact;
    if (status) teacherUpdateData.status = status;
    teacherUpdateData.updatedBy = req.user._id;

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      teacherUpdateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'user', select: 'firstName lastName email phone profileImage' },
      { path: 'session', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: { teacher: updatedTeacher }
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating teacher'
    });
  }
};

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private (Admin)
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check if teacher is assigned to any active classes
    const activeAssignments = teacher.assignedClasses.length + teacher.assignedSubjects.length;
    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete teacher. They have ${activeAssignments} active assignments. Please reassign classes/subjects first.`
      });
    }

    // Soft delete - deactivate user and set teacher status to inactive
    await User.findByIdAndUpdate(teacher.user, { 
      isActive: false,
      updatedBy: req.user._id 
    });
    
    await Teacher.findByIdAndUpdate(req.params.id, { 
      status: 'Terminated',
      updatedBy: req.user._id 
    });

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting teacher'
    });
  }
};

// @desc    Assign class to teacher
// @route   POST /api/teachers/:id/assign-class
// @access  Private (Admin)
const assignClass = async (req, res) => {
  try {
    const { classId, sectionId, isClassTeacher = false } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // If assigning as class teacher, remove existing class teacher
    if (isClassTeacher) {
      await Class.findByIdAndUpdate(classId, { classTeacher: teacher.user });
      
      // Remove class teacher assignment from other teachers
      await Teacher.updateMany(
        { 'assignedClasses.class': classId },
        { $set: { 'assignedClasses.$.isClassTeacher': false } }
      );
    }

    await teacher.assignClass(classId, sectionId, isClassTeacher);

    res.json({
      success: true,
      message: 'Class assigned successfully'
    });
  } catch (error) {
    console.error('Assign class error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning class'
    });
  }
};

// @desc    Assign subject to teacher
// @route   POST /api/teachers/:id/assign-subject
// @access  Private (Admin)
const assignSubject = async (req, res) => {
  try {
    const { subjectId, classIds = [] } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify subject exists
    const subjectExists = await Subject.findById(subjectId);
    if (!subjectExists) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    await teacher.assignSubject(subjectId, classIds);

    res.json({
      success: true,
      message: 'Subject assigned successfully'
    });
  } catch (error) {
    console.error('Assign subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning subject'
    });
  }
};

// @desc    Get teacher schedule
// @route   GET /api/teachers/:id/schedule
// @access  Private (Admin, Teacher)
const getTeacherSchedule = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('assignedClasses.class', 'name grade')
      .populate('assignedClasses.section', 'name')
      .populate('assignedSubjects.subject', 'name code')
      .populate('assignedSubjects.classes', 'name grade');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Build schedule from working hours and assignments
    const schedule = {
      workingHours: teacher.workingHours,
      assignedClasses: teacher.assignedClasses,
      assignedSubjects: teacher.assignedSubjects,
      totalWorkload: teacher.assignedClasses.length + teacher.assignedSubjects.reduce((sum, as) => sum + as.classes.length, 0)
    };

    res.json({
      success: true,
      data: { schedule }
    });
  } catch (error) {
    console.error('Get teacher schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher schedule'
    });
  }
};

// @desc    Get teacher statistics
// @route   GET /api/teachers/stats
// @access  Private (Admin)
const getTeacherStats = async (req, res) => {
  try {
    const { session } = req.query;
    let matchQuery = {};
    
    if (session) {
      matchQuery.session = mongoose.Types.ObjectId(session);
    }

    const stats = await Teacher.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await Teacher.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const summary = {
      total: await Teacher.countDocuments(matchQuery),
      active: stats.find(s => s._id === 'Active')?.count || 0,
      inactive: stats.find(s => s._id === 'Inactive')?.count || 0,
      onLeave: stats.find(s => s._id === 'On Leave')?.count || 0,
      terminated: stats.find(s => s._id === 'Terminated')?.count || 0
    };

    res.json({
      success: true,
      data: {
        summary,
        statusWise: stats,
        departmentWise: departmentStats
      }
    });
  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher statistics'
    });
  }
};

module.exports = {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignClass,
  assignSubject,
  getTeacherSchedule,
  getTeacherStats
};