const { validationResult } = require('express-validator');
const FeeStructure = require('../models/FeeStructure');
const FeePayment = require('../models/FeePayment');
const FeeType = require('../models/FeeType');
const Student = require('../models/Student');
const Class = require('../models/Class');
const mongoose = require('mongoose');

// @desc    Get fee structures
// @route   GET /api/fees/structures
// @access  Private (Admin, Student, Parent)
const getFeeStructures = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      class: classId,
      session,
      feeType,
      status = 'Active'
    } = req.query;

    // Build query
    let query = { status };

    if (classId) query.class = classId;
    if (session) query.session = session;
    if (feeType) query.feeType = feeType;

    // Execute query with pagination
    const feeStructures = await FeeStructure.find(query)
      .populate('class', 'name grade')
      .populate('feeType', 'name description')
      .populate('session', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FeeStructure.countDocuments(query);

    res.json({
      success: true,
      data: {
        feeStructures,
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
    console.error('Get fee structures error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fee structures'
    });
  }
};

// @desc    Create fee structure
// @route   POST /api/fees/structures
// @access  Private (Admin)
const createFeeStructure = async (req, res) => {
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
      feeType,
      amount,
      dueDate,
      lateFeePenalty,
      discountPercentage,
      isOptional,
      session
    } = req.body;

    // Check if fee structure already exists for this class and fee type
    const existingStructure = await FeeStructure.findOne({
      class: classId,
      feeType,
      session: session || req.user.session
    });

    if (existingStructure) {
      return res.status(400).json({
        success: false,
        message: 'Fee structure already exists for this class and fee type'
      });
    }

    // Create fee structure
    const feeStructure = await FeeStructure.create({
      name,
      description,
      class: classId,
      feeType,
      amount,
      dueDate: new Date(dueDate),
      lateFeePenalty: lateFeePenalty || 0,
      discountPercentage: discountPercentage || 0,
      isOptional: isOptional || false,
      session: session || req.user.session,
      createdBy: req.user._id
    });

    // Populate the response
    await feeStructure.populate([
      { path: 'class', select: 'name grade' },
      { path: 'feeType', select: 'name description' },
      { path: 'session', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Fee structure created successfully',
      data: { feeStructure }
    });
  } catch (error) {
    console.error('Create fee structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating fee structure'
    });
  }
};

// @desc    Get fee payments
// @route   GET /api/fees/payments
// @access  Private (Admin, Student-own, Parent-own)
const getFeePayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      student: studentId,
      class: classId,
      feeType,
      status,
      startDate,
      endDate
    } = req.query;

    // Build query based on user role
    let query = {};

    // Role-based filtering
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        query.student = student._id;
      }
    } else if (req.user.role === 'Parent') {
      const children = await Student.find({ parent: req.user._id });
      if (children.length > 0) {
        query.student = { $in: children.map(child => child._id) };
      }
    }

    // Apply filters
    if (studentId) query.student = studentId;
    if (classId) {
      // Get students from the class
      const students = await Student.find({ class: classId });
      query.student = { $in: students.map(s => s._id) };
    }
    if (feeType) query.feeType = feeType;
    if (status) query.status = status;

    // Date filtering
    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Execute query with pagination
    const payments = await FeePayment.find(query)
      .populate('student', 'admissionNumber rollNumber')
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate({
        path: 'student',
        populate: {
          path: 'class',
          select: 'name grade'
        }
      })
      .populate('feeType', 'name description')
      .populate('collectedBy', 'firstName lastName')
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FeePayment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
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
    console.error('Get fee payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fee payments'
    });
  }
};

// @desc    Record fee payment
// @route   POST /api/fees/payments
// @access  Private (Admin)
const recordFeePayment = async (req, res) => {
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
      student: studentId,
      feeType,
      amount,
      paymentMethod,
      transactionId,
      paymentDate,
      remarks,
      lateFee,
      discount
    } = req.body;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get fee structure for validation
    const feeStructure = await FeeStructure.findOne({
      class: student.class,
      feeType,
      status: 'Active'
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: 'Fee structure not found for this student and fee type'
      });
    }

    // Check if payment already exists for this fee type
    const existingPayment = await FeePayment.findOne({
      student: studentId,
      feeType,
      status: 'Paid'
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already recorded for this fee type'
      });
    }

    // Calculate total amount
    const baseAmount = amount || feeStructure.amount;
    const lateFeeAmount = lateFee || 0;
    const discountAmount = discount || 0;
    const totalAmount = baseAmount + lateFeeAmount - discountAmount;

    // Create payment record
    const payment = await FeePayment.create({
      student: studentId,
      feeType,
      amount: baseAmount,
      lateFee: lateFeeAmount,
      discount: discountAmount,
      totalAmount,
      paymentMethod,
      transactionId,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      remarks,
      status: 'Paid',
      collectedBy: req.user._id
    });

    // Populate the response
    await payment.populate([
      { path: 'student', select: 'admissionNumber rollNumber', populate: { path: 'user', select: 'firstName lastName' } },
      { path: 'feeType', select: 'name description' },
      { path: 'collectedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Fee payment recorded successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Record fee payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording fee payment'
    });
  }
};

// @desc    Get student fee status
// @route   GET /api/fees/student/:studentId/status
// @access  Private (Admin, Student-own, Parent-own)
const getStudentFeeStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { session } = req.query;

    // Check permissions
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || student._id.toString() !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own fee status.'
        });
      }
    } else if (req.user.role === 'Parent') {
      const student = await Student.findOne({ _id: studentId, parent: req.user._id });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your child\'s fee status.'
        });
      }
    }

    // Get student details
    const student = await Student.findById(studentId)
      .populate('class', 'name grade')
      .populate('user', 'firstName lastName');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get fee structures for student's class
    const feeStructures = await FeeStructure.find({
      class: student.class._id,
      session: session || student.session,
      status: 'Active'
    }).populate('feeType', 'name description');

    // Get payments for this student
    const payments = await FeePayment.find({
      student: studentId,
      status: 'Paid'
    }).populate('feeType', 'name description');

    // Build fee status
    const feeStatus = feeStructures.map(structure => {
      const payment = payments.find(p => 
        p.feeType._id.toString() === structure.feeType._id.toString()
      );

      const isPaid = !!payment;
      const isOverdue = !isPaid && new Date() > structure.dueDate;
      const daysOverdue = isOverdue ? 
        Math.floor((new Date() - structure.dueDate) / (1000 * 60 * 60 * 24)) : 0;

      return {
        feeType: structure.feeType,
        amount: structure.amount,
        dueDate: structure.dueDate,
        isPaid,
        isOverdue,
        daysOverdue,
        paymentDate: payment?.paymentDate || null,
        amountPaid: payment?.totalAmount || 0,
        receiptNumber: payment?.receiptNumber || null,
        lateFee: isOverdue ? structure.lateFeePenalty * daysOverdue : 0
      };
    });

    // Calculate summary
    const summary = {
      totalFees: feeStructures.reduce((sum, structure) => sum + structure.amount, 0),
      totalPaid: payments.reduce((sum, payment) => sum + payment.totalAmount, 0),
      totalPending: 0,
      totalOverdue: 0,
      overdueCount: 0
    };

    feeStatus.forEach(fee => {
      if (!fee.isPaid) {
        summary.totalPending += fee.amount + fee.lateFee;
        if (fee.isOverdue) {
          summary.totalOverdue += fee.amount + fee.lateFee;
          summary.overdueCount++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        student,
        summary,
        feeStatus
      }
    });
  } catch (error) {
    console.error('Get student fee status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fee status'
    });
  }
};

// @desc    Generate fee receipt
// @route   GET /api/fees/payments/:paymentId/receipt
// @access  Private (Admin, Student-own, Parent-own)
const generateFeeReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await FeePayment.findById(paymentId)
      .populate('student', 'admissionNumber rollNumber')
      .populate({
        path: 'student',
        populate: [
          { path: 'user', select: 'firstName lastName' },
          { path: 'class', select: 'name grade' }
        ]
      })
      .populate('feeType', 'name description')
      .populate('collectedBy', 'firstName lastName');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || student._id.toString() !== payment.student._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own receipts.'
        });
      }
    } else if (req.user.role === 'Parent') {
      const student = await Student.findOne({ 
        _id: payment.student._id, 
        parent: req.user._id 
      });
      if (!student) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your child\'s receipts.'
        });
      }
    }

    // Generate receipt data
    const receipt = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      student: {
        name: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
        admissionNumber: payment.student.admissionNumber,
        rollNumber: payment.student.rollNumber,
        class: `${payment.student.class.name} (Grade ${payment.student.class.grade})`
      },
      feeDetails: {
        feeType: payment.feeType.name,
        description: payment.feeType.description,
        amount: payment.amount,
        lateFee: payment.lateFee,
        discount: payment.discount,
        totalAmount: payment.totalAmount
      },
      paymentDetails: {
        method: payment.paymentMethod,
        transactionId: payment.transactionId,
        collectedBy: `${payment.collectedBy.firstName} ${payment.collectedBy.lastName}`,
        remarks: payment.remarks
      }
    };

    res.json({
      success: true,
      data: { receipt }
    });
  } catch (error) {
    console.error('Generate fee receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating receipt'
    });
  }
};

// @desc    Get fee statistics
// @route   GET /api/fees/stats
// @access  Private (Admin)
const getFeeStats = async (req, res) => {
  try {
    const { session, class: classId, startDate, endDate } = req.query;
    let matchQuery = {};

    if (startDate && endDate) {
      matchQuery.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Collection statistics
    const collectionStats = await FeePayment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Monthly collection
    const monthlyCollection = await FeePayment.aggregate([
      { $match: { ...matchQuery, status: 'Paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Payment method wise
    const paymentMethodStats = await FeePayment.aggregate([
      { $match: { ...matchQuery, status: 'Paid' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const summary = {
      totalCollected: collectionStats.find(s => s._id === 'Paid')?.totalAmount || 0,
      totalPayments: collectionStats.find(s => s._id === 'Paid')?.count || 0,
      pendingPayments: collectionStats.find(s => s._id === 'Pending')?.count || 0,
      failedPayments: collectionStats.find(s => s._id === 'Failed')?.count || 0
    };

    res.json({
      success: true,
      data: {
        summary,
        collectionStats,
        monthlyCollection,
        paymentMethodStats
      }
    });
  } catch (error) {
    console.error('Get fee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fee statistics'
    });
  }
};

module.exports = {
  getFeeStructures,
  createFeeStructure,
  getFeePayments,
  recordFeePayment,
  getStudentFeeStatus,
  generateFeeReceipt,
  getFeeStats
};