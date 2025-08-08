const { body, validationResult } = require('express-validator');
const validator = require('validator');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Comprehensive input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Remove any keys that start with '$' or contain '.'
  mongoSanitize.sanitize(req.body, {
    replaceWith: '_'
  });
  mongoSanitize.sanitize(req.query, {
    replaceWith: '_'
  });
  mongoSanitize.sanitize(req.params, {
    replaceWith: '_'
  });

  // Additional sanitization for common injection patterns
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove HTML tags
    str = validator.stripLow(str);
    
    // Escape HTML entities
    str = validator.escape(str);
    
    // Remove script tags and javascript: protocols
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    str = str.replace(/javascript:/gi, '');
    str = str.replace(/on\w+\s*=/gi, '');
    
    return str.trim();
  };

  // Recursively sanitize all string values
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
};

/**
 * Authentication input validation
 */
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
];

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 6 characters with uppercase, lowercase, and number'),
  
  body('phoneNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('university')
    .isMongoId()
    .withMessage('Please provide a valid university ID')
];

const emailValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('resetCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Reset code must be a 6-digit number'),
  
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 6 characters with uppercase, lowercase, and number')
];

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
      const amount = parseFloat(value);
      if (amount <= 0) throw new Error('Amount must be positive');
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have at most 2 decimal places');
      }
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
      const amount = parseFloat(value);
      if (amount <= 0) throw new Error('Amount must be positive');
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have at most 2 decimal places');
      }
      return true;
    }),
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation errors for security monitoring
    console.warn('Validation failed:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      errors: errors.array(),
      body: req.body
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
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
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount provided' });
    }
    req.body.amount = Math.round(amount * 100) / 100;
  }
  next();
};

/**
 * Additional security checks for suspicious patterns
 */
const securityChecks = (req, res, next) => {
  const { amount, recipientUsername } = req.body;
  const userId = req.user?._id?.toString();
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    // Round numbers that might indicate automated scripts
    amount && amount % 1000 === 0 && amount >= 10000,
    // Self-transfer attempt
    recipientUsername && req.user?.username === recipientUsername,
    // Very large amounts
    amount && amount > 100000
  ];

  if (suspiciousPatterns.some(pattern => pattern)) {
    console.warn(`Suspicious transaction pattern detected for user ${userId}:`, {
      amount,
      recipientUsername,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Add additional verification requirement
    req.requiresAdditionalVerification = true;
  }

  next();
};

/**
 * Profile update validation
 */
const profileUpdateValidation = [
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters'),
  
  body('nearestLandmark')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Nearest landmark must be less than 200 characters')
];

module.exports = {
  sanitizeInput,
  loginValidation,
  registerValidation,
  emailValidation,
  passwordResetValidation,
  transferValidation,
  paymentValidation,
  withdrawalValidation,
  profileUpdateValidation,
  handleValidationErrors,
  sanitizeAmount,
  securityChecks
};