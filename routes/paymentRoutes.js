// routes/payment.routes.js
const express = require('express');
const { initiatePayment, verifyPayment } = require('../controllers/paymentControllers.js');
const { authenticateUser } = require('../middlewares/authenticateUser.js');
const { paymentInitiationLimiter } = require('../middlewares/rateLimiter.js');
const { transactionLock } = require('../middlewares/transactionLock.js');
const { concurrencyGuard } = require('../middlewares/concurrencyGuard.js');
const { paymentValidation, handleValidationErrors, sanitizeAmount } = require('../middlewares/inputValidation.js');
const router = express.Router();

/**
 * @swagger
 * /pay:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment initiated
 *       400:
 *         description: Validation error
 */

router.post('/pay', 
  authenticateUser, 
  concurrencyGuard('payment'),
  paymentInitiationLimiter,
  paymentValidation,
  handleValidationErrors,
  sanitizeAmount,
  transactionLock('payment'),
  initiatePayment
);

/**
 * @swagger
 * /pay/callback:
 *   get:
 *     tags: [Payments]
 *     summary: Payment callback/verification
 *     responses:
 *       200:
 *         description: Payment verified
 *       400:
 *         description: Verification failed
 */

router.get('/callback', verifyPayment);

module.exports = router;
