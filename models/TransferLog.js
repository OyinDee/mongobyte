const mongoose = require('mongoose');

const transferLogSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  senderBalanceBefore: {
    type: Number,
    required: true
  },
  senderBalanceAfter: {
    type: Number,
    required: true
  },
  recipientBalanceBefore: {
    type: Number,
    required: true
  },
  recipientBalanceAfter: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  failureReason: {
    type: String
  },
  reversalReason: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transferLogSchema.index({ senderId: 1, createdAt: -1 });
transferLogSchema.index({ recipientId: 1, createdAt: -1 });
transferLogSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to update timestamp
transferLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('TransferLog', transferLogSchema);