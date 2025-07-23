const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const userControllers = require('../controllers/userControllers');
const authenticate = require('../middlewares/authenticateRestaurant');
const { authenticateUser } = require('../middlewares/authenticateUser');
const customBodyParser = require('../middlewares/bodyParser');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - meals
 *         - totalPrice
 *         - location
 *         - nearestLandmark
 *       properties:
 *         meals:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               mealId:
 *                 type: string
 *               quantity:
 *                 type: number
 *         totalPrice:
 *           type: number
 *         location:
 *           type: string
 *         nearestLandmark:
 *           type: string
 *         note:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         fee:
 *           type: number
 *       example:
 *         meals: [
 *           {
 *             mealId: "meal123",
 *             quantity: 2
 *           }
 *         ]
 *         totalPrice: 3000
 *         location: "Student Hostel"
 *         nearestLandmark: "Block B"
 *         note: "Extra spicy please"
 *         phoneNumber: "+2348012345678"
 *         fee: 600
 */

/**
 * @swagger
 * /orders/create:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order
 *     description: Place a new order with the selected meals
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 */
router.post('/create', authenticateUser, orderController.createOrder);

/**
 * @swagger
 * /orders/restaurant/{customId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get restaurant orders
 *     description: Get all orders for a specific restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant's custom ID
 *     responses:
 *       200:
 *         description: List of orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized - Not a restaurant account
 */
router.get('/restaurant/:customId', authenticate, orderController.getOrdersByRestaurant);

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     tags: [Orders]
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
 *     tags: [Orders]
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

router.get('/order-history', authenticateUser, userControllers.getUserOrderHistory);

/**
 * @swagger
 * /orders/{orderId}/confirm:
 *   post:
 *     tags: [Orders]
 *     summary: Restaurant confirm order with optional additional fee
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID (customId)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               additionalFee:
 *                 type: number
 *                 description: Optional additional fee amount
 *                 example: 800
 *               requestDescription:
 *                 type: string
 *                 description: Reason for additional fee
 *                 example: "Extra distance delivery to off-campus location"
 *     responses:
 *       200:
 *         description: Order confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   type: object
 *       400:
 *         description: Fee exceeds limit or insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Order not found
 */

router.post('/:orderId/confirm', authenticate, customBodyParser, orderController.orderConfirmation);

/**
 * @swagger
 * /orders/deliver/{orderId}:
 *   patch:
 *     tags: [Orders]
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
 *     tags: [Orders]
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

// New endpoint: Order for non-app user (external recipient)
router.post('/gift-external', authenticateUser, orderController.createOrderForExternalRecipient);

/**
 * @swagger
 * /orders/by-reference:
 *   post:
 *     tags: [Orders]
 *     summary: Place a new order by referencing another order's customId
 *     description: Place a new order using the restaurant and meals from an existing order (optionally override delivery info, note, etc.)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderCustomId
 *             properties:
 *               orderCustomId:
 *                 type: string
 *                 description: The customId of the order to reference
 *               note:
 *                 type: string
 *               location:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               nearestLandmark:
 *                 type: string
 *               fee:
 *                 type: number
 *               mealsOverride:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     mealId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *     responses:
 *       201:
 *         description: Order placed successfully by reference
 *       400:
 *         description: Validation error
 *       404:
 *         description: Referenced order not found
 */
router.post('/by-reference', authenticateUser, orderController.createOrderByOrderCustomId);

module.exports = router;
