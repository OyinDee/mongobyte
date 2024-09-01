const express = require('express');
const router = express.Router();

const authController = require('../controllers/authControllers');

// Register a new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Verify email
router.get('/verify-email', authController.verifyEmail);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
