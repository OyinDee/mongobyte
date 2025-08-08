const rateLimit = require('express-rate-limit');

// Simple in-memory rate limiter for financial operations
const financialOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user to 5 financial operations per windowMs
  message: {
    error: 'Too many financial operations attempted. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user ? req.user._id.toString() : req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for super admins
    return req.user && req.user.superAdmin;
  }
});

// Stricter rate limiter for transfers
const transferLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each user to 3 transfers per hour
  message: {
    error: 'Transfer limit exceeded. You can only make 3 transfers per hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
});

// Rate limiter for payment initiation
const paymentInitiationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each user to 3 payment attempts per 10 minutes
  message: {
    error: 'Payment initiation limit exceeded. Please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
});

module.exports = {
  financialOperationsLimiter,
  transferLimiter,
  paymentInitiationLimiter
};