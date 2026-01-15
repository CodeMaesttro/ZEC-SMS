const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getFeeStructures,
  createFeeStructure,
  getFeePayments,
  recordFeePayment,
  getStudentFeeStatus,
  generateFeeReceipt,
  getFeeStats
} = require('../controllers/feesController');
const { protect } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Fee Structure Routes
router.get('/structures', protect, getFeeStructures);

router.post('/structures', [
  protect,
  roleAuth(['Admin']),
  body('name').notEmpty().withMessage('Fee structure name is required'),
  body('class').isMongoId().withMessage('Valid class ID is required'),
  body('feeType').isMongoId().withMessage('Valid fee type ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], createFeeStructure);

// Fee Payment Routes
router.get('/payments', protect, getFeePayments);

router.post('/payments', [
  protect,
  roleAuth(['Admin']),
  body('student').isMongoId().withMessage('Valid student ID is required'),
  body('feeType').isMongoId().withMessage('Valid fee type ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentMethod').isIn(['Cash', 'Card', 'Bank Transfer', 'Online', 'Cheque'])
    .withMessage('Invalid payment method'),
  body('transactionId').optional().notEmpty().withMessage('Transaction ID cannot be empty if provided')
], recordFeePayment);

// Student Fee Status
router.get('/student/:studentId/status', protect, getStudentFeeStatus);

// Receipt Generation
router.get('/payments/:paymentId/receipt', protect, generateFeeReceipt);

// Fee Statistics
router.get('/stats', protect, roleAuth(['Admin']), getFeeStats);

module.exports = router;