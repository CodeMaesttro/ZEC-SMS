const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');

// @route   GET /api/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/', getDashboardStats);

module.exports = router;