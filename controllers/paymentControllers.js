
const axios = require('axios');
require('dotenv').config();
const Payment = require('../models/payments');
const { updateByteBalance } = require('./userControllers');

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
        callback_url: 'https://bytego.vercel.app/user/fund/callback', 
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
const feePercentage = 0.03;
const fundAmount = totalAmountReceived / (1 + feePercentage);  

const amountInBytes = fundAmount / 10; 


await updateByteBalance({
  body: { user_id: payment.user_id, byteFund: amountInBytes },
});
      payment.status = 'credited';
      await payment.save();
      response.send('Payment successful!');
    } else {
      response.send('Payment failed.');
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
