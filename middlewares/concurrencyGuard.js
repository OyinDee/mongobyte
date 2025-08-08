/**
 * Simple in-memory concurrency guard for additional protection
 * This provides immediate protection while MongoDB lock is being processed
 */

// In-memory store for active operations
const activeOperations = new Map();

/**
 * Middleware to prevent rapid concurrent requests from the same user
 * This is a lightweight first-line defense before MongoDB locking
 */
const concurrencyGuard = (operationType = 'financial') => {
  return (req, res, next) => {
    const userId = req.user._id.toString();
    const operationKey = `${operationType}:${userId}`;
    
    // Check if user has an active operation
    if (activeOperations.has(operationKey)) {
      return res.status(429).json({
        error: 'Please wait for your previous operation to complete.',
        code: 'RAPID_REQUEST_DETECTED'
      });
    }
    
    // Mark operation as active
    activeOperations.set(operationKey, {
      startTime: Date.now(),
      userId,
      operationType
    });
    
    // Set timeout to auto-cleanup (safety net)
    const timeoutId = setTimeout(() => {
      activeOperations.delete(operationKey);
    }, 30000); // 30 seconds
    
    // Store cleanup info in request
    req.concurrencyInfo = { operationKey, timeoutId };
    
    // Override res.end to ensure cleanup
    const originalEnd = res.end;
    res.end = function(...args) {
      // Clean up active operation
      if (req.concurrencyInfo) {
        activeOperations.delete(req.concurrencyInfo.operationKey);
        clearTimeout(req.concurrencyInfo.timeoutId);
      }
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

/**
 * Manual cleanup function
 */
const releaseConcurrencyGuard = (req) => {
  if (req.concurrencyInfo) {
    activeOperations.delete(req.concurrencyInfo.operationKey);
    clearTimeout(req.concurrencyInfo.timeoutId);
  }
};

/**
 * Get active operations count (for monitoring)
 */
const getActiveOperationsCount = () => {
  return activeOperations.size;
};

/**
 * Cleanup stale operations (run periodically)
 */
const cleanupStaleOperations = () => {
  const now = Date.now();
  const staleThreshold = 30000; // 30 seconds
  
  for (const [key, operation] of activeOperations.entries()) {
    if (now - operation.startTime > staleThreshold) {
      activeOperations.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupStaleOperations, 60000);

module.exports = {
  concurrencyGuard,
  releaseConcurrencyGuard,
  getActiveOperationsCount
};