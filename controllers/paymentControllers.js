
const axios = require('axios');
require('dotenv').config();
const Payment = require('../models/payments');
const { updateByteBalance } = require('./userControllers');
const Notification = require('../models/Notifications')
const initiatePayment = async (request, response) => {
  const { amount } = request.body;

  if (!amount) {
    return response.status(400).json({ message: 'Invalid request' });
  }

  try {
    const result = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100, 
        email: request.user.email,
        callback_url: 'https://www.yumbyte.ng/user/fund/callback', 
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, reference } = result.data.data;


    const newPayment = new Payment({
      reference, 
      amount,
      email: request.user.email,
      user_id: request.user._id,
    });

    await newPayment.save();


    response.status(200).json({ url: authorization_url });
  } catch (error) {
    console.error('Error initiating payment:', error);
    response.status(500).json({ message: 'Error initiating payment' });
  }
};

  
const verifyPayment = async (request, response) => {
  const reference = request.query.reference;


  try {
    const payment = await Payment.findOne({ reference });

    if (!payment) {
      return response.status(400).send('Payment not found.');
    }

    if (payment.status === 'credited') {
      return response.send('Payment already credited.');
    }

    const result = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    if (result.data.data.status === 'success') {
      const totalAmountReceived = Number(payment.amount);  
const feePercentage = 0.05;
const fundAmount = totalAmountReceived / (1 + feePercentage);  
const byteFund = fundAmount; 


await updateByteBalance({
  body: { user_id: payment.user_id, byteFund },
});
      payment.status = 'credited';
      await payment.save();
      response.send('Payment successful!');
      const userNotification = new Notification({
        userId: payment.user_id,
        message: `Your payment of ${payment.amount}NGN was successful and your wallet has been funded with ₦${byteFund}!`,
      });

      await userNotification.save();

    } else {
      response.send('Payment failed.');
      const userNotification = new Notification({
        userId: payment.user_id,
        message: `Your payment with reference ${reference} failed. Please try again.`,
      });
      
      await userNotification.save();
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    response.send('Payment verification failed.');
  }
};


module.exports = {
  initiatePayment,
  verifyPayment,
};
