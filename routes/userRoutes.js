const express = require('express');
const router = express.Router();

const userController = require('../controllers/userControllers');

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Update byte balance
router.put('/byte-balance', userController.updateByteBalance);

module.exports = router;
