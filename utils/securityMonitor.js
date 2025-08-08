const mongoose = require('mongoose');

/**
 * Security monitoring and alerting system for financial operations
 */
class SecurityMonitor {
  constructor() {
    this.suspiciousActivityThresholds = {
      rapidTransfers: 5, // More than 5 transfers in 10 minutes
      largeAmounts: 10000, // Transfers above 10,000 bytes
      roundAmounts: 1000, // Round amounts that might indicate automation
      failedAttempts: 3 // More than 3 failed attempts in 5 minutes
    };
  }

  /**
   * Monitor transfer patterns for suspicious activity
   */
  async monitorTransferActivity(userId, amount, recipientId) {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      const TransferLog = require('../models/TransferLog');
      
      // Check for rapid transfers
      const recentTransfers = await TransferLog.countDocuments({
        senderId: userId,
        createdAt: { $gte: tenMinutesAgo },
        status: 'completed'
      });

      // Check for large amount transfers
      const largeTransfersToday = await TransferLog.countDocuments({
        senderId: userId,
        amount: { $gte: this.suspiciousActivityThresholds.largeAmounts },
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        status: 'completed'
      });

      // Check for round amount patterns (potential automation)
      const isRoundAmount = amount % this.suspiciousActivityThresholds.roundAmounts === 0;

      // Check for transfers to same recipient
      const transfersToSameRecipient = await TransferLog.countDocuments({
        senderId: userId,
        recipientId: recipientId,
        createdAt: { $gte: oneHourAgo },
        status: 'completed'
      });

      const suspiciousFlags = [];

      if (recentTransfers >= this.suspiciousActivityThresholds.rapidTransfers) {
        suspiciousFlags.push('RAPID_TRANSFERS');
      }

      if (amount >= this.suspiciousActivityThresholds.largeAmounts) {
        suspiciousFlags.push('LARGE_AMOUNT');
      }

      if (isRoundAmount && amount >= this.suspiciousActivityThresholds.roundAmounts) {
        suspiciousFlags.push('ROUND_AMOUNT');
      }

      if (transfersToSameRecipient >= 3) {
        suspiciousFlags.push('REPEATED_RECIPIENT');
      }

      if (largeTransfersToday >= 5) {
        suspiciousFlags.push('MULTIPLE_LARGE_TRANSFERS');
      }

      // Log suspicious activity
      if (suspiciousFlags.length > 0) {
        await this.logSuspiciousActivity({
          userId,
          activityType: 'TRANSFER',
          flags: suspiciousFlags,
          amount,
          recipientId,
          metadata: {
            recentTransfers,
            largeTransfersToday,
            transfersToSameRecipient
          }
        });

        // Return risk level
        return {
          riskLevel: suspiciousFlags.length >= 3 ? 'HIGH' : 'MEDIUM',
          flags: suspiciousFlags,
          requiresReview: suspiciousFlags.length >= 2
        };
      }

      return { riskLevel: 'LOW', flags: [], requiresReview: false };

    } catch (error) {
      console.error('Error monitoring transfer activity:', error);
      return { riskLevel: 'UNKNOWN', flags: [], requiresReview: false };
    }
  }

  /**
   * Monitor payment patterns for suspicious activity
   */
  async monitorPaymentActivity(userId, amount) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      const Payment = require('../models/payments');
      
      // Check for rapid payment attempts
      const recentPayments = await Payment.countDocuments({
        user_id: userId,
        createdAt: { $gte: oneHourAgo }
      });

      // Check for failed payment attempts
      const failedPayments = await Payment.countDocuments({
        user_id: userId,
        status: 'failed',
        createdAt: { $gte: new Date(now.getTime() - 5 * 60 * 1000) }
      });

      const suspiciousFlags = [];

      if (recentPayments >= 10) {
        suspiciousFlags.push('RAPID_PAYMENTS');
      }

      if (failedPayments >= this.suspiciousActivityThresholds.failedAttempts) {
        suspiciousFlags.push('MULTIPLE_FAILURES');
      }

      if (amount >= 100000) { // Very large payments
        suspiciousFlags.push('VERY_LARGE_PAYMENT');
      }

      if (suspiciousFlags.length > 0) {
        await this.logSuspiciousActivity({
          userId,
          activityType: 'PAYMENT',
          flags: suspiciousFlags,
          amount,
          metadata: {
            recentPayments,
            failedPayments
          }
        });

        return {
          riskLevel: suspiciousFlags.length >= 2 ? 'HIGH' : 'MEDIUM',
          flags: suspiciousFlags,
          requiresReview: suspiciousFlags.includes('VERY_LARGE_PAYMENT')
        };
      }

      return { riskLevel: 'LOW', flags: [], requiresReview: false };

    } catch (error) {
      console.error('Error monitoring payment activity:', error);
      return { riskLevel: 'UNKNOWN', flags: [], requiresReview: false };
    }
  }

  /**
   * Log suspicious activity for review
   */
  async logSuspiciousActivity(activityData) {
    try {
      const SuspiciousActivity = require('../models/SuspiciousActivity');
      
      const suspiciousActivity = new SuspiciousActivity({
        ...activityData,
        timestamp: new Date(),
        reviewed: false
      });

      await suspiciousActivity.save();

      // Send alert to administrators (implement based on your notification system)
      console.warn('Suspicious activity detected:', activityData);

    } catch (error) {
      console.error('Error logging suspicious activity:', error);
    }
  }

  /**
   * Check if user should be temporarily restricted
   */
  async shouldRestrictUser(userId) {
    try {
      const SuspiciousActivity = require('../models/SuspiciousActivity');
      
      const recentSuspiciousActivity = await SuspiciousActivity.countDocuments({
        userId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        reviewed: false
      });

      return recentSuspiciousActivity >= 5; // Restrict if 5+ unreviewed suspicious activities in 24h

    } catch (error) {
      console.error('Error checking user restriction status:', error);
      return false;
    }
  }
}

module.exports = new SecurityMonitor();