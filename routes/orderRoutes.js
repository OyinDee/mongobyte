const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const userControllers = require('../controllers/userControllers');
const authenticate = require('../middlewares/authenticateRestaurant');

router.post('/create', orderController.createOrder);

router.get('/restaurant/:customId', authenticate, orderController.getOrdersByRestaurant);

router.get('/:orderId', orderController.getOrderById);

router.get('/:userId/order-history', userControllers.getUserOrderHistory);

router.patch('/:orderId', orderController.orderConfirmation);

router.patch('/deliver/:orderId',  orderController.markOrderAsDelivered);

router.post('/:orderId/status', orderController.handleOrderStatus);

module.exports = router;
