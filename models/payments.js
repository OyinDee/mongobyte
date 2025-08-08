const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'credited', 'failed', 'expired'],
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
  creditedAt: {
    type: Date
  },
  creditedAmount: {
    type: Number,
    min: 0
  },
  paystackTransactionId: {
    type: String
  },
  failureReason: {
    type: String
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
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
paymentSchema.index({ user_id: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to update timestamp
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
