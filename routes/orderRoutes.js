const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const userControllers = require('../controllers/userControllers');
const authenticate = require('../middlewares/authenticateRestaurant');

/**
 * @swagger
 * /orders/create:
 *   post:
 *     summary: Create a new order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */

router.post('/create', orderController.createOrder);

/**
 * @swagger
 * /orders/restaurant/{customId}:
 *   get:
 *     summary: Get orders for a restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 */

router.get('/restaurant/:customId', authenticate, orderController.getOrdersByRestaurant);

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */

router.get('/:orderId', orderController.getOrderById);

/**
 * @swagger
 * /orders/{userId}/order-history:
 *   get:
 *     summary: Get user order history by user ID
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 */

router.get('/:userId/order-history', userControllers.getUserOrderHistory);

/**
 * @swagger
 * /orders/{orderId}:
 *   patch:
 *     summary: Confirm order
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order confirmed
 */

router.patch('/:orderId', orderController.orderConfirmation);

/**
 * @swagger
 * /orders/deliver/{orderId}:
 *   patch:
 *     summary: Mark order as delivered
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order marked as delivered
 */

router.patch('/deliver/:orderId',  orderController.markOrderAsDelivered);

/**
 * @swagger
 * /orders/{orderId}/status:
 *   post:
 *     summary: Update order status
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Order status updated
 */

router.post('/:orderId/status', orderController.handleOrderStatus);

module.exports = router;
