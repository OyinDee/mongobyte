const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../middlewares/authenticateRestaurant');

router.post('/create', authenticate, orderController.createOrder);

router.get('/restaurant/:customId', authenticate, orderController.getOrdersByRestaurant);

router.get('/:orderId', authenticate, orderController.getOrderById);

router.get('/:userId/order-history',  userController.getUserOrderHistory);

module.exports = router;
