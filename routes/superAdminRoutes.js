const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authenticate = require('../middlewares/authenticate');
/**
 * @swagger
 * /api/v1/superadmin/top-customers:
 *   get:
 *     tags: [Admin]
 *     summary: Get top customers
 *     description: Returns a list of top customers by total amount spent
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top customers to return
 *     responses:
 *       200:
 *         description: List of top customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       totalSpent:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/top-customers', superAdminController.getTopCustomers);

/**
 * @swagger
 * /api/v1/superadmin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard summary stats and recent activity
 *     description: Returns summary stats, recent orders, users, top restaurants, and pending withdrawals for the dashboard
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Time range for growth stats
 *     responses:
 *       200:
 *         description: Dashboard data
 *       500:
 *         description: Server error
 */
router.get('/dashboard', superAdminController.getDashboard);


/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Super admin operations and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Order ID
 *         user:
 *           type: string
 *           description: User ID who placed the order
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, cancelled]
 *           description: Current status of the order
 *         meals:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               meal:
 *                 type: string
 *                 description: Meal ID
 *               quantity:
 *                 type: number
 *                 description: Quantity of the meal
 *         totalAmount:
 *           type: number
 *           description: Total order amount
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Order creation timestamp
 *       example:
 *         _id: "60d5ecb44b24a13a5c8b4567"
 *         user: "60d5ecb44b24a13a5c8b4568"
 *         status: "pending"
 *         meals: [{ meal: "60d5ecb44b24a13a5c8b4569", quantity: 2 }]
 *         totalAmount: 2500
 *         createdAt: "2023-06-25T10:30:00Z"
 */

/**
 * @swagger
 * /api/v1/superadmin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: Get all orders
 *     description: Retrieve all orders in the system (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/orders', authenticate, superAdminController.getAllOrders);

/**
 * @swagger
 * /api/v1/superadmin/orders/{orderId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get order by ID
 *     description: Retrieve specific order details (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/orders/:orderId', authenticate, superAdminController.getOrderById);

/**
 * @swagger
 * /api/v1/superadmin/orders/{orderId}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update order status
 *     description: Update the status of a specific order (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, cancelled]
 *                 description: New status for the order
 *             example:
 *               status: "completed"
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.put('/orders/:orderId/status', authenticate, superAdminController.updateOrderStatus);

/**
 * @swagger
 * /api/v1/superadmin/orders/{orderId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete order
 *     description: Delete a specific order (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to delete
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order deleted successfully"
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.delete('/orders/:orderId', authenticate, superAdminController.deleteOrder);

/**
 * @swagger
 * /api/v1/superadmin/restaurants:
 *   post:
 *     tags: [Admin]
 *     summary: Create a restaurant
 *     description: Create a new restaurant (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Restaurant'
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 restaurant:
 *                   $ref: '#/components/schemas/Restaurant'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/restaurants', authenticate, superAdminController.createRestaurant);

/**
 * @swagger
 * /api/v1/superadmin/restaurants/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get restaurant by ID
 *     description: Retrieve restaurant details by ID (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant custom ID
 *     responses:
 *       200:
 *         description: Restaurant details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       404:
 *         description: Restaurant not found
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/restaurants/:id', authenticate, superAdminController.getRestaurantById);

/**
 * @swagger
 * /api/v1/superadmin/restaurants/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete restaurant
 *     description: Delete a restaurant by ID (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant custom ID
 *     responses:
 *       200:
 *         description: Restaurant deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Restaurant deleted successfully!"
 *       404:
 *         description: Restaurant not found
 *       401:
 *         description: Unauthorized - Admin access required
 *       500:
 *         description: Internal server error
 */
router.delete('/restaurants/:id', authenticate, superAdminController.deleteRestaurant);

/**
 * @swagger
 * /api/v1/superadmin/universities/{universityId}/nearest-landmarks:
 *   put:
 *     tags: [Admin]
 *     summary: Update nearest landmarks for a university
 *     description: Add or update the nearest landmarks list for a university (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: universityId
 *         required: true
 *         schema:
 *           type: string
 *         description: University ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nearestLandmarks
 *             properties:
 *               nearestLandmarks:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of nearest landmarks
 *     responses:
 *       200:
 *         description: Nearest landmarks updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Admin access required
 *       403:
 *         description: Only super admins can update nearest landmarks
 *       404:
 *         description: University not found
 *       500:
 *         description: Internal server error
 */
router.put('/universities/:universityId/nearest-landmarks', authenticate, superAdminController.updateUniversityNearestLandmarks);

module.exports = router;

