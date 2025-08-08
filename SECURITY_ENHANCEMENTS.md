# Financial Endpoints Security Enhancements

## Overview
This document outlines the comprehensive security measures implemented to protect fund and transfer endpoints against scripts, concurrent requests, and fraudulent activities.

## Security Measures Implemented

### 1. Rate Limiting
- **Financial Operations**: 5 operations per 15 minutes per user
- **Transfers**: 3 transfers per hour per user  
- **Payment Initiation**: 3 payment attempts per 10 minutes per user
- Uses MongoDB store for distributed rate limiting across server instances
- Super admins are exempt from rate limiting

### 2. Transaction Locking (MongoDB-based)
- Prevents concurrent financial operations for the same user
- Uses MongoDB for distributed locking across multiple server instances
- 30-second auto-expiry with automatic cleanup
- Dual-layer protection: in-memory concurrency guard + MongoDB locks

### 3. Input Validation & Sanitization
- **Transfer amounts**: 1-50,000 bytes, max 2 decimal places
- **Payment amounts**: ₦100-₦500,000, max 2 decimal places
- **Withdrawal amounts**: ₦1,000-₦1,000,000, max 2 decimal places
- Username format validation (alphanumeric + underscore only)
- Automatic amount sanitization and rounding

### 4. Database Transactions
- All financial operations use MongoDB transactions
- Atomic operations ensure data consistency
- Automatic rollback on failures
- Session-based locking prevents race conditions

### 5. Security Monitoring
- Real-time suspicious activity detection
- Automated flagging of unusual patterns:
  - Rapid transfers (>5 in 10 minutes)
  - Large amounts (>10,000 bytes)
  - Round amounts (potential automation)
  - Repeated recipients
  - Multiple failed attempts
- Risk level assessment (LOW/MEDIUM/HIGH)
- Automatic user restriction for high-risk activities

### 6. Audit Logging
- Complete transaction logs with:
  - User IDs and balances before/after
  - IP addresses and user agents
  - Timestamps and status
  - Failure reasons
- Separate logs for transfers and payments
- Indexed for efficient querying

### 7. Enhanced Payment Security
- Unique reference generation with user ID and timestamp
- Payment expiration (30 minutes)
- Amount and email verification against Paystack
- Duplicate payment prevention
- Comprehensive error handling

### 8. Additional Security Checks
- Self-transfer prevention
- Balance verification with concurrent operation buffer
- Suspicious pattern detection
- User restriction based on activity history
- Enhanced error logging for security incidents

## File Structure

### New Security Middleware
- `middlewares/rateLimiter.js` - Rate limiting configurations
- `middlewares/transactionLock.js` - MongoDB-based locking
- `middlewares/concurrencyGuard.js` - In-memory rapid request protection
- `middlewares/inputValidation.js` - Input validation and sanitization

### Enhanced Models
- `models/TransferLog.js` - Transfer audit logging
- `models/PaymentLog.js` - Payment audit logging  
- `models/SuspiciousActivity.js` - Security monitoring
- `models/payments.js` - Enhanced with security fields

### Security Utilities
- `utils/securityMonitor.js` - Real-time monitoring and alerting

## Required Dependencies
```json
{
  "express-rate-limit": "^7.1.5",
  "rate-limit-mongo": "^2.3.2", 
  "express-validator": "^7.0.1"
}
```

## Environment Variables Required
```env
MONGODB_URI=mongodb://localhost:27017/your-database
```

**Note: Redis is NOT required - all security features use MongoDB only**

## API Endpoint Changes

### Transfer Endpoint: `POST /api/v1/users/transfer`
**New Security Layers:**
1. User authentication
2. Transfer rate limiting (3/hour)
3. Financial operations rate limiting (5/15min)
4. Input validation and sanitization
5. Security pattern checks
6. Transaction locking
7. Database transaction with rollback
8. Audit logging
9. Suspicious activity monitoring

### Payment Endpoints: `POST /api/v1/pay/pay` & `GET /api/v1/pay/callback`
**New Security Layers:**
1. User authentication
2. Payment initiation rate limiting (3/10min)
3. Input validation and sanitization
4. Transaction locking
5. Enhanced Paystack integration with verification
6. Payment expiration handling
7. Duplicate payment prevention
8. Comprehensive audit logging

## Monitoring & Alerts

### Suspicious Activity Flags
- `RAPID_TRANSFERS` - More than 5 transfers in 10 minutes
- `LARGE_AMOUNT` - Transfers above 10,000 bytes
- `ROUND_AMOUNT` - Round amounts indicating potential automation
- `REPEATED_RECIPIENT` - Multiple transfers to same user
- `MULTIPLE_LARGE_TRANSFERS` - 5+ large transfers in 24 hours
- `RAPID_PAYMENTS` - 10+ payment attempts in 1 hour
- `MULTIPLE_FAILURES` - 3+ failed payments in 5 minutes
- `VERY_LARGE_PAYMENT` - Payments above ₦100,000

### Risk Levels
- **LOW**: Normal activity, no flags
- **MEDIUM**: 1-2 suspicious flags, increased monitoring
- **HIGH**: 3+ suspicious flags, requires review
- **UNKNOWN**: Monitoring system error

### Automatic Actions
- User restriction after 5 unreviewed suspicious activities in 24 hours
- Enhanced logging for all flagged activities
- Real-time alerts to administrators

## Performance Considerations
- All database queries are indexed for optimal performance
- Redis operations are non-blocking with fallback mechanisms
- Rate limiting uses efficient MongoDB storage
- Transaction logs are automatically cleaned up based on retention policies

## Testing Recommendations
1. Test concurrent request handling with multiple simultaneous transfers
2. Verify rate limiting works across different user sessions
3. Test Redis failover scenarios
4. Validate transaction rollback on database errors
5. Test suspicious activity detection with various patterns
6. Verify payment verification against Paystack sandbox

## Maintenance
- Monitor Redis memory usage and configure appropriate eviction policies
- Regularly review suspicious activity logs
- Update rate limiting thresholds based on usage patterns
- Archive old audit logs to maintain performance
- Monitor database transaction performance and optimize as needed