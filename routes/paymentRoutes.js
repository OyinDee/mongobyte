// routes/payment.routes.js
const express = require('express');
const { initiatePayment, verifyPayment } = require('../controllers/paymentControllers.js');
const authenticate = require('../middlewares/authenticateUser.js')
const router = express.Router();

router.post('/pay', authenticate, initiatePayment);
router.get('/callback', verifyPayment);

module.exports = router;
