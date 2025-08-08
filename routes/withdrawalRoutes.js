const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { createWithdrawal } = require('../controllers/orderController');
const authenticate = require('../middlewares/authenticateRestaurant');

/**
 * @swagger
 * /withdrawals:
 *   post:
 *     tags: [Withdrawals]
 *     summary: Create withdrawal request
 *     description: Create a new withdrawal request for the authenticated restaurant
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantName:
 *                 type: string
 *                 description: Restaurant name
 *               amount:
 *                 type: number
 *                 description: Amount to withdraw
 *             required:
 *               - restaurantName
 *               - amount
 *     responses:
 *       201:
 *         description: Withdrawal request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (insufficient balance, etc.)
 *       404:
 *         description: Restaurant not found
 */
router.post('/', authenticate, createWithdrawal);

/**
 * @swagger
 * /withdrawals:
 *   get:
 *     tags: [Withdrawals]
 *     summary: List all withdrawals
 *     description: Retrieve a list of all withdrawal requests (Admin access)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all withdrawals
 */
router.get('/', withdrawalController.listWithdrawals);

/**
 * @swagger
 * /withdrawals/restaurant/{customId}:
 *   get:
 *     tags: [Withdrawals]
 *     summary: Get withdrawal history for a restaurant
 *     description: Retrieve all withdrawal requests for a specific restaurant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant's custom ID or ObjectId
 *     responses:
 *       200:
 *         description: Withdrawal history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   restaurantName:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   status:
 *                     type: string
 *                     enum: [pending, approved, rejected]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   processedAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Restaurant not found
 */
router.get('/restaurant/:customId', authenticate, withdrawalController.getRestaurantWithdrawals);

/**
 * @swagger
 * /withdrawals/{id}:
 *   get:
 *     tags: [Withdrawals]
 *     summary: Get a single withdrawal
 *     description: Retrieve details of a specific withdrawal request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Withdrawal details
 *       404:
 *         description: Withdrawal not found
 */
router.get('/:id', withdrawalController.getWithdrawal);

/**
 * @swagger
 * /withdrawals/{id}/status:
 *   patch:
 *     tags: [Withdrawals]
 *     summary: Update withdrawal status
 *     description: Update the status of a withdrawal request (Admin access)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Withdrawal status updated
 *       404:
 *         description: Withdrawal not found
 */
router.patch('/:id/status', withdrawalController.updateWithdrawalStatus);

module.exports = router;