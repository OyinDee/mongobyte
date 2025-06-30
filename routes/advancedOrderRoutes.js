const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authenticateUser');
const {
    // Scheduled Orders
    createScheduledOrder,
    getUserScheduledOrders,
    cancelScheduledOrder,
    
    // Group Orders
    createGroupOrder,
    joinGroupOrder,
    addMealsToGroupOrder,
    getPublicGroupOrders,
    
    // Payment Processing
    processGroupOrderPayment,
    getGroupOrderPaymentStatus,
    refundGroupOrder,
    
    // Quick Reorder
    saveQuickReorder,
    getUserQuickReorders,
    executeQuickReorder
} = require('../controllers/advancedOrderControllers');

const {
    addChatMessage,
    getGroupOrderChat,
    getGroupOrderDetails,
    leaveGroupOrder,
    cancelGroupOrder
} = require('../controllers/groupOrderExtrasControllers');

// ===== SCHEDULED ORDERS ROUTES =====

/**
 * @swagger
 * components:
 *   schemas:
 *     ScheduledOrder:
 *       type: object
 *       required:
 *         - meals
 *         - restaurant
 *         - scheduledFor
 *       properties:
 *         meals:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               meal:
 *                 type: string
 *               quantity:
 *                 type: number
 *         restaurant:
 *           type: string
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *         repeatType:
 *           type: string
 *           enum: [none, daily, weekly, monthly]
 *         repeatDays:
 *           type: array
 *           items:
 *             type: string
 *         endDate:
 *           type: string
 *           format: date-time
 *         note:
 *           type: string
 *         recipient:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             phone:
 *               type: string
 *             instructions:
 *               type: string
 */

/**
 * @swagger
 * /api/advanced-orders/scheduled:
 *   post:
 *     summary: Create a scheduled order
 *     tags: [Scheduled Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduledOrder'
 *     responses:
 *       201:
 *         description: Scheduled order created successfully
 *       400:
 *         description: Bad request
 */
router.post('/scheduled', authenticateUser, createScheduledOrder);

/**
 * @swagger
 * /api/advanced-orders/scheduled:
 *   get:
 *     summary: Get user's scheduled orders
 *     tags: [Scheduled Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Scheduled orders retrieved successfully
 */
router.get('/scheduled', authenticateUser, getUserScheduledOrders);

/**
 * @swagger
 * /api/advanced-orders/scheduled/{orderId}/cancel:
 *   put:
 *     summary: Cancel a scheduled order
 *     tags: [Scheduled Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scheduled order ID
 *     responses:
 *       200:
 *         description: Scheduled order cancelled successfully
 *       404:
 *         description: Scheduled order not found
 */
router.put('/scheduled/:orderId/cancel', authenticateUser, cancelScheduledOrder);

// ===== GROUP ORDERS ROUTES =====

/**
 * @swagger
 * components:
 *   schemas:
 *     GroupOrder:
 *       type: object
 *       required:
 *         - title
 *         - restaurant
 *         - orderDeadline
 *         - deliveryInfo
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         restaurant:
 *           type: string
 *         orderDeadline:
 *           type: string
 *           format: date-time
 *         deliveryTime:
 *           type: string
 *           format: date-time
 *         deliveryInfo:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             landmark:
 *               type: string
 *             instructions:
 *               type: string
 *         maxParticipants:
 *           type: number
 *         minOrderAmount:
 *           type: number
 *         splitMethod:
 *           type: string
 *           enum: [individual, equal, custom]
 *         isPublic:
 *           type: boolean
 */

/**
 * @swagger
 * /api/advanced-orders/group:
 *   post:
 *     summary: Create a group order
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupOrder'
 *     responses:
 *       201:
 *         description: Group order created successfully
 *       400:
 *         description: Bad request
 */
router.post('/group', authenticateUser, createGroupOrder);

/**
 * @swagger
 * /api/advanced-orders/group/public:
 *   get:
 *     summary: Get public group orders
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: restaurant
 *         schema:
 *           type: string
 *         description: Filter by restaurant
 *       - in: query
 *         name: university
 *         schema:
 *           type: boolean
 *         description: Filter by user's university
 *     responses:
 *       200:
 *         description: Public group orders retrieved successfully
 */
router.get('/group/public', authenticateUser, getPublicGroupOrders);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/join:
 *   post:
 *     summary: Join a group order
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Successfully joined group order
 *       400:
 *         description: Cannot join group order
 *       404:
 *         description: Group order not found
 */
router.post('/group/:orderId/join', authenticateUser, joinGroupOrder);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/meals:
 *   post:
 *     summary: Add meals to group order
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     meal:
 *                       type: string
 *                     quantity:
 *                       type: number
 *     responses:
 *       200:
 *         description: Meals added to group order successfully
 *       403:
 *         description: Not a participant in this group order
 *       404:
 *         description: Group order not found
 */
router.post('/group/:orderId/meals', authenticateUser, addMealsToGroupOrder);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}:
 *   get:
 *     summary: Get group order details
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Group order details retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Group order not found
 */
router.get('/group/:orderId', authenticateUser, getGroupOrderDetails);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/chat:
 *   post:
 *     summary: Add message to group order chat
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message added successfully
 *       403:
 *         description: Not a participant in this group order
 *       404:
 *         description: Group order not found
 */
router.post('/group/:orderId/chat', authenticateUser, addChatMessage);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/chat:
 *   get:
 *     summary: Get group order chat messages
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Messages per page
 *     responses:
 *       200:
 *         description: Chat messages retrieved successfully
 *       403:
 *         description: Not a participant in this group order
 *       404:
 *         description: Group order not found
 */
router.get('/group/:orderId/chat', authenticateUser, getGroupOrderChat);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/leave:
 *   post:
 *     summary: Leave a group order
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Successfully left the group order
 *       400:
 *         description: Cannot leave group order
 *       404:
 *         description: Group order not found
 */
router.post('/group/:orderId/leave', authenticateUser, leaveGroupOrder);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/cancel:
 *   put:
 *     summary: Cancel a group order (creator only)
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Group order cancelled successfully
 *       403:
 *         description: Only creator can cancel
 *       404:
 *         description: Group order not found
 */
router.put('/group/:orderId/cancel', authenticateUser, cancelGroupOrder);

// ===== GROUP ORDER PAYMENT ROUTES =====

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/pay:
 *   post:
 *     summary: Process payment for group order
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     amountPaid:
 *                       type: number
 *                     newBalance:
 *                       type: number
 *                     allPaid:
 *                       type: boolean
 *                     orderStatus:
 *                       type: string
 *       400:
 *         description: Payment error (insufficient balance, already paid, etc.)
 *       404:
 *         description: Group order not found
 */
router.post('/group/:orderId/pay', authenticateUser, processGroupOrderPayment);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/payment-status:
 *   get:
 *     summary: Get group order payment status
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     yourPayment:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         hasPaid:
 *                           type: boolean
 *                     groupSummary:
 *                       type: object
 *                       properties:
 *                         totalParticipants:
 *                           type: number
 *                         paidParticipants:
 *                           type: number
 *                         unpaidParticipants:
 *                           type: array
 *                         allPaid:
 *                           type: boolean
 *       403:
 *         description: Not a participant in this group order
 *       404:
 *         description: Group order not found
 */
router.get('/group/:orderId/payment-status', authenticateUser, getGroupOrderPaymentStatus);

/**
 * @swagger
 * /api/advanced-orders/group/{orderId}/refund:
 *   post:
 *     summary: Process refund for cancelled group order
 *     tags: [Group Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group order ID
 *     responses:
 *       200:
 *         description: Refunds processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     refundsProcessed:
 *                       type: number
 *                     totalRefunded:
 *                       type: number
 *                     refunds:
 *                       type: array
 *       400:
 *         description: Can only refund cancelled orders
 *       403:
 *         description: Only creator can process refunds
 *       404:
 *         description: Group order not found
 */
router.post('/group/:orderId/refund', authenticateUser, refundGroupOrder);

// ===== QUICK REORDER ROUTES =====

/**
 * @swagger
 * components:
 *   schemas:
 *     QuickReorder:
 *       type: object
 *       required:
 *         - orderId
 *       properties:
 *         orderId:
 *           type: string
 *         name:
 *           type: string
 */

/**
 * @swagger
 * /api/advanced-orders/quick-reorder:
 *   post:
 *     summary: Save an order as quick reorder
 *     tags: [Quick Reorder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuickReorder'
 *     responses:
 *       201:
 *         description: Order saved for quick reorder
 *       404:
 *         description: Order not found
 *       403:
 *         description: Access denied
 */
router.post('/quick-reorder', authenticateUser, saveQuickReorder);

/**
 * @swagger
 * /api/advanced-orders/quick-reorder:
 *   get:
 *     summary: Get user's quick reorders
 *     tags: [Quick Reorder]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quick reorders retrieved successfully
 */
router.get('/quick-reorder', authenticateUser, getUserQuickReorders);

/**
 * @swagger
 * /api/advanced-orders/quick-reorder/{reorderId}/execute:
 *   post:
 *     summary: Execute a quick reorder
 *     tags: [Quick Reorder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reorderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Quick reorder ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               nearestLandmark:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       404:
 *         description: Quick reorder not found
 */
router.post('/quick-reorder/:reorderId/execute', authenticateUser, executeQuickReorder);

module.exports = router;
