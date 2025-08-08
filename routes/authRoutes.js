const express = require('express');
const router = express.Router();

const authController = require('../controllers/authControllers');
const { 
  sanitizeInput, 
  loginValidation, 
  registerValidation, 
  emailValidation, 
  passwordResetValidation, 
  handleValidationErrors 
} = require('../middlewares/inputValidation');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - phoneNumber
 *         - university
 *         - address
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username for the user
 *         email:
 *           type: string
 *           format: email
 *           description: Valid email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User password (minimum 6 characters)
 *         phoneNumber:
 *           type: string
 *           description: User's phone number
 *         university:
 *           type: string
 *           description: User's university/campus
 *         address:
 *           type: string
 *           description: User's delivery address
 *       example:
 *         username: "johndoe"
 *         email: "john@example.com"
 *         password: "password123"
 *         phoneNumber: "+2348012345678"
 *         university: "University of Lagos"
 *         address: "Block A, Room 101, Student Hostel"
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User registered successfully. Check email for verification code.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Registration successful! Please check your email to verify your account."
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email already exists"
 */
router.post('/register', sanitizeInput, registerValidation, handleValidationErrors, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login to user account
 *     description: Authenticate user and get JWT token for subsequent requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', sanitizeInput, loginValidation, handleValidationErrors, authController.login);

/**
 * @swagger
 * /auth/verify-email:
 *   get:
 *     tags: [Authentication]
 *     summary: Verify user email
 *     description: Verify user's email address using the verification code sent during registration
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification code received in email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification code
 */
router.get('/verify-email', authController.verifyEmail);

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend verification email
 *     description: Request a new verification code if the original one expired or wasn't received
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to resend verification code to
 *     responses:
 *       200:
 *         description: New verification code sent successfully
 *       404:
 *         description: User not found
 */
router.post('/resend-verification', sanitizeInput, emailValidation, handleValidationErrors, authController.resendVerification);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send a password reset code to user's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address for password reset
 *     responses:
 *       200:
 *         description: Password reset code sent to email
 *       404:
 *         description: User not found
 */
router.post('/forgot-password', sanitizeInput, emailValidation, handleValidationErrors, authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password
 *     description: Reset user password using the code received in email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - resetCode
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               resetCode:
 *                 type: string
 *                 description: Reset code received in email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: New password (minimum 6 characters)
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired reset code
 */
router.post('/reset-password', sanitizeInput, passwordResetValidation, handleValidationErrors, authController.resetPassword);

module.exports = router;
