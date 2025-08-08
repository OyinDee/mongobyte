const mongoose = require('mongoose');

// Create a simple lock model for MongoDB-based locking
const lockSchema = new mongoose.Schema({
  lockKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  lockValue: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  lockType: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Define TTL index
lockSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 });

const TransactionLock = mongoose.model('TransactionLock', lockSchema);

/**
 * Middleware to prevent concurrent financial operations for the same user
 * Uses MongoDB for distributed locking across multiple server instances
 */
const transactionLock = (lockType = 'financial') => {
  return async (req, res, next) => {
    const userId = req.user._id.toString();
    const lockKey = `${lockType}_lock:${userId}`;
    const lockValue = `${Date.now()}_${Math.random()}`;

    try {
      // Try to acquire lock by creating a document
      const lock = new TransactionLock({
        lockKey,
        lockValue,
        userId,
        lockType
      });

      await lock.save();
      
      // Store lock info in request for cleanup
      req.lockInfo = { lockId: lock._id, lockKey, lockValue };

      // Override res.end to ensure lock cleanup
      const originalEnd = res.end;
      res.end = function(...args) {
        // Clean up lock
        cleanupLock(lock._id);
        originalEnd.apply(this, args);
      };

      next();
    } catch (error) {
      // If lock already exists (duplicate key error), operation is in progress
      if (error.code === 11000) {
        return res.status(429).json({
          error: 'Another financial operation is in progress. Please wait and try again.',
          code: 'CONCURRENT_OPERATION_DETECTED'
        });
      }
      
      console.error('Transaction lock error:', error);
      // For other errors, proceed without lock but log the issue
      console.warn('Lock system unavailable, proceeding without lock');
      next();
    }
  };
};

/**
 * Clean up the lock safely
 */
async function cleanupLock(lockId) {
  try {
    if (lockId) {
      await TransactionLock.findByIdAndDelete(lockId);
    }
  } catch (error) {
    console.error('Error cleaning up lock:', error);
  }
}

/**
 * Manual lock cleanup for error handling
 */
const releaseLock = async (req) => {
  if (req.lockInfo && req.lockInfo.lockId) {
    await cleanupLock(req.lockInfo.lockId);
  }
};

// No need for manual cleanup - MongoDB TTL index will handle it automatically

module.exports = {
  transactionLock,
  releaseLock,
  TransactionLock
};