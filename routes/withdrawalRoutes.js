const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');

// List all withdrawals
router.get('/', withdrawalController.listWithdrawals);

// Get a single withdrawal
router.get('/:id', withdrawalController.getWithdrawal);

// Update withdrawal status
router.patch('/:id/status', withdrawalController.updateWithdrawalStatus);

module.exports = router; 