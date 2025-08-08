const mongoose = require('mongoose');

const suspiciousActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  activityType: {
    type: String,
    enum: ['TRANSFER', 'PAYMENT', 'WITHDRAWAL', 'LOGIN'],
    required: true,
    index: true
  },
  flags: [{
    type: String,
    enum: [
      'RAPID_TRANSFERS',
      'LARGE_AMOUNT',
      'ROUND_AMOUNT',
      'REPEATED_RECIPIENT',
      'MULTIPLE_LARGE_TRANSFERS',
      'RAPID_PAYMENTS',
      'MULTIPLE_FAILURES',
      'VERY_LARGE_PAYMENT',
      'UNUSUAL_PATTERN',
      'CONCURRENT_REQUESTS'
    ]
  }],
  amount: {
    type: Number,
    min: 0
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  reviewed: {
    type: Boolean,
    default: false,
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  actionTaken: {
    type: String,
    enum: ['NONE', 'WARNING_SENT', 'ACCOUNT_RESTRICTED', 'ACCOUNT_SUSPENDED']
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
suspiciousActivitySchema.index({ userId: 1, timestamp: -1 });
suspiciousActivitySchema.index({ activityType: 1, reviewed: 1, timestamp: -1 });
suspiciousActivitySchema.index({ reviewed: 1, timestamp: -1 });

module.exports = mongoose.model('SuspiciousActivity', suspiciousActivitySchema);