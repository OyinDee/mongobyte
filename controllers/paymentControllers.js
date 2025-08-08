
const axios = require('axios');
require('dotenv').config();
const Payment = require('../models/payments');
const { updateByteBalance } = require('./userControllers');
const Notification = require('../models/Notifications')
const initiatePayment = async (request, response) => {
  const { amount } = request.body;
  const userId = request.user._id;

  if (!amount || amount <= 0) {
    return response.status(400).json({ message: 'Invalid payment amount' });
  }

  // Additional security checks
  if (amount < 100 || amount > 500000) {
    return response.status(400).json({ 
      message: 'Payment amount must be between ₦100 and ₦500,000' 
    });
  }

  try {
    // Check for existing pending payments
    const existingPendingPayment = await Payment.findOne({
      user_id: userId,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // 30 minutes
    });

    if (existingPendingPayment) {
      return response.status(400).json({ 
        message: 'You have a pending payment. Please complete or wait for it to expire.',
        existingReference: existingPendingPayment.reference
      });
    }

    // Generate unique reference with timestamp and user ID
    const timestamp = Date.now();
    const uniqueRef = `YB_${userId.toString().slice(-6)}_${timestamp}`;

    const result = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: Math.round(amount * 100), // Ensure integer cents
        email: request.user.email,
        reference: uniqueRef,
        callback_url: 'https://www.yumbyte.ng/user/fund/callback',
        metadata: {
          user_id: userId.toString(),
          original_amount: amount,
          initiated_at: new Date().toISOString(),
          ip_address: request.ip
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 100000 // 
      }
    );

    const { authorization_url, reference } = result.data.data;

    // Create payment record with additional security fields
    const newPayment = new Payment({
      reference: reference || uniqueRef,
      amount,
      email: request.user.email,
      user_id: userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
    });

    await newPayment.save();

    // Log payment initiation for audit
    console.log('Payment initiated:', {
      userId: userId.toString(),
      amount,
      reference,
      ip: request.ip
    });

    response.status(200).json({ 
      url: authorization_url,
      reference,
      amount,
      expiresIn: '30 minutes'
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    
    // Log security incident
    console.error('Payment initiation failed:', {
      userId: userId.toString(),
      amount,
      error: error.message,
      ip: request.ip
    });
    
    if (error.code === 'ECONNABORTED') {
      return response.status(408).json({ message: 'Payment service timeout. Please try again.' });
    }
    
    response.status(500).json({ message: 'Unable to initiate payment. Please try again.' });
  }
};

  
const verifyPayment = async (request, response) => {
  const reference = request.query.reference;
  const mongoose = require('mongoose');

  if (!reference) {
    return response.status(400).send('Payment reference is required.');
  }

  // Start database session for transaction
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    // Find payment with session lock
    const payment = await Payment.findOne({ reference }).session(session);

    if (!payment) {
      await session.abortTransaction();
      return response.status(400).send('Payment not found.');
    }

    // Check if payment has expired
    if (payment.expiresAt && new Date() > payment.expiresAt) {
      payment.status = 'expired';
      await payment.save({ session });
      await session.commitTransaction();
      return response.status(400).send('Payment has expired.');
    }

    if (payment.status === 'credited') {
      await session.abortTransaction();
      return response.send('Payment already credited.');
    }

    if (payment.status === 'failed' || payment.status === 'expired') {
      await session.abortTransaction();
      return response.status(400).send('Payment cannot be processed.');
    }

    // Verify with Paystack with timeout
    const result = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      timeout: 10000 // 10 second timeout
    });

    const paystackData = result.data.data;

    // Additional security checks
    if (paystackData.status === 'success') {
      // Verify amount matches
      const expectedAmount = Math.round(payment.amount * 100);
      if (paystackData.amount !== expectedAmount) {
        payment.status = 'failed';
        payment.failureReason = 'Amount mismatch';
        await payment.save({ session });
        await session.commitTransaction();
        
        console.error('Payment amount mismatch:', {
          reference,
          expected: expectedAmount,
          received: paystackData.amount
        });
        
        return response.status(400).send('Payment verification failed: Amount mismatch.');
      }

      // Verify email matches
      if (paystackData.customer.email !== payment.email) {
        payment.status = 'failed';
        payment.failureReason = 'Email mismatch';
        await payment.save({ session });
        await session.commitTransaction();
        
        console.error('Payment email mismatch:', {
          reference,
          expected: payment.email,
          received: paystackData.customer.email
        });
        
        return response.status(400).send('Payment verification failed: Email mismatch.');
      }

      // Calculate fund amount with proper fee handling
      const totalAmountReceived = Number(payment.amount);  
      const feePercentage = 0.10;
      const fundAmount = totalAmountReceived / (1 + feePercentage);  
      const byteFund = Math.round(fundAmount * 100) / 100; // Round to 2 decimal places

      // Update user balance atomically
      const User = require('../models/User');
      const updatedUser = await User.findByIdAndUpdate(
        payment.user_id,
        { $inc: { byteBalance: byteFund } },
        { new: true, session }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        return response.status(400).send('User not found.');
      }

      // Update payment status
      payment.status = 'credited';
      payment.creditedAt = new Date();
      payment.creditedAmount = byteFund;
      payment.paystackTransactionId = paystackData.id;
      await payment.save({ session });

      // Create audit log
      const PaymentLog = require('../models/PaymentLog');
      const paymentLog = new PaymentLog({
        paymentId: payment._id,
        userId: payment.user_id,
        reference: reference,
        amount: payment.amount,
        creditedAmount: byteFund,
        paystackTransactionId: paystackData.id,
        status: 'success',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });
      await paymentLog.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Send notification (outside transaction)
      const userNotification = new Notification({
        userId: payment.user_id,
        message: `Your payment of ₦${payment.amount} was successful and your wallet has been funded with ₦${byteFund}!`,
      });
      await userNotification.save();

      // Log successful payment
      console.log('Payment verified successfully:', {
        reference,
        userId: payment.user_id.toString(),
        amount: payment.amount,
        creditedAmount: byteFund
      });

      response.send('Payment successful!');

    } else {
      // Payment failed
      payment.status = 'failed';
      payment.failureReason = paystackData.gateway_response || 'Payment failed';
      await payment.save({ session });
      await session.commitTransaction();

      const userNotification = new Notification({
        userId: payment.user_id,
        message: `Your payment with reference ${reference} failed. Please try again.`,
      });
      await userNotification.save();

      response.status(400).send('Payment failed.');
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('Error verifying payment:', error);
    
    // Log security incident
    console.error('Payment verification error:', {
      reference,
      error: error.message,
      ip: request.ip
    });
    
    response.status(500).send('Payment verification failed.');
  } finally {
    await session.endSession();
  }
};


module.exports = {
  initiatePayment,
  verifyPayment,
};
