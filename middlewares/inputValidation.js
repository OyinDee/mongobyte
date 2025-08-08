const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

/**
 * Input validation rules for financial operations
 */
const transferValidation = [
  body('recipientUsername')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid recipient username format'),
  
  body('amount')
    .isFloat({ min: 1, max: 50000 })
    .withMessage('Amount must be between 1 and 50,000')
    .custom((value) => {
      return true;
    }),
];

const paymentValidation = [
  body('amount')
    .isFloat({ min: 100, max: 500000 })
    .withMessage('Payment amount must be between ₦100 and ₦500,000')
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have at most 2 decimal places');
      }
      return true;
    }),
];

const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 1000, max: 1000000 })
    .withMessage('Withdrawal amount must be between ₦1,000 and ₦1,000,000')
    .custom((value) => {
      return true;
    }),
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Sanitize and normalize financial amounts
 */
const sanitizeAmount = (req, res, next) => {
  if (req.body.amount) {
    // Convert to number and round to 2 decimal places
    req.body.amount = Math.round(parseFloat(req.body.amount) * 100) / 100;
  }
  next();
};

/**
 * Additional security checks for suspicious patterns
 */
const securityChecks = (req, res, next) => {
  const { amount, recipientUsername } = req.body;
  const userId = req.user._id.toString();
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    // Round numbers that might indicate automated scripts
    amount && amount % 1000 === 0 && amount >= 10000,
    // Self-transfer attempt
    recipientUsername && req.user.username === recipientUsername,
    // Rapid sequential amounts (would need session storage to track)
  ];

  if (suspiciousPatterns.some(pattern => pattern)) {
    console.warn(`Suspicious transaction pattern detected for user ${userId}:`, {
      amount,
      recipientUsername,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    // Add additional verification requirement
    req.requiresAdditionalVerification = true;
  }

  next();
};

module.exports = {
  transferValidation,
  paymentValidation,
  withdrawalValidation,
  handleValidationErrors,
  sanitizeAmount,
  securityChecks
};