const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantControllers');
const authenticateAdmin = require('../middlewares/authenticate.js');
const authenticate = require('../middlewares/authenticateRestaurant.js');
const authController = require('../controllers/authControllers');
const restaurantAdvancedOrdersController = require('../controllers/restaurantAdvancedOrdersController');
const { getRestaurantNotifications } = require('../controllers/restaurantControllers');
const { authenticateUser } = require('../middlewares/authenticateUser');

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management and operations
 */
// Fetch notifications for the authenticated restaurant
router.get('/notifications', authenticate, getRestaurantNotifications);
/**
 * @swagger
 * components:
 *   schemas:
 *     Restaurant:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - location
 *         - university
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the restaurant
 *         email:
 *           type: string
 *           format: email
 *           description: Restaurant contact email
 *         university:
 *           type: string
 *           description: University/Campus where the restaurant operates
 *         location:
 *           type: string
 *           description: Physical location within the campus
 *         description:
 *           type: string
 *           description: About the restaurant
 *         contactNumber:
 *           type: string
 *           description: Restaurant contact number
 *         imageUrl:
 *           type: string
 *           description: Restaurant profile image
 *         bankName:
 *           type: string
 *           description: Bank name for payments
 *         accountNumber:
 *           type: string
 *           description: Account number for payments
 *         accountHolder:
 *           type: string
 *           description: Name of account holder
 *       example:
 *         name: "Campus Bites"
 *         email: "campusbites@example.com"
 *         university: "University of Lagos"
 *         location: "Faculty of Engineering Building"
 *         description: "Best campus restaurant"
 *         contactNumber: "+2348012345678"
 *         imageUrl: "https://example.com/restaurant.jpg"
 */

/**
 * @swagger
 * /restaurants/mymeals/{customId}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant meals
 *     description: Retrieve all meals for a specific restaurant
 *     parameters:
 *       - in: path
 *         name: customId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant's unique ID
 *     responses:
 *       200:
 *         description: List of meals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meal'
 *       404:
 *         description: Restaurant not found
 */
router.get('/mymeals/:customId', restaurantController.getMealsByRestaurant);

/**
 * @swagger
 * /restaurants/create:
 *   post:
 *     tags: [Restaurants]
 *     summary: Create a restaurant
 *     description: Create a new restaurant account (Admin access required)
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
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Admin access required
 */
router.post('/create', authenticateAdmin, restaurantController.createRestaurant);

/**
 * @swagger
 * /restaurants/withdraw:
 *   post:
 *     tags: [Restaurants]
 *     summary: Create a withdrawal request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Withdrawal request created
 *       400:
 *         description: Validation error
 */

router.post('/withdraw', authenticate, restaurantController.createWithdrawal);

/**
 * @swagger
 * /restaurants/login:
 *   post:
 *     tags: [Restaurants]
 *     summary: Restaurant login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

router.post('/login', authController.loginRestaurant);

/**
 * @swagger
 * /restaurants:
 *   get:
 *     tags: [Restaurants]
 *     summary: List all restaurants
 *     responses:
 *       200:
 *         description: List of restaurants
 */

router.get('/', restaurantController.getAllRestaurants);

// Debug route to list all restaurants
router.get('/debug/list', restaurantController.debugRestaurants);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant details
 *       404:
 *         description: Restaurant not found
 */

router.get('/:id', restaurantController.getRestaurantById);

/**
 * @swagger
 * /restaurants/{id}:
 *   put:
 *     tags: [Restaurants]
 *     summary: Update restaurant by ID
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
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *       400:
 *         description: Validation error
 */

router.put('/:id', authenticate, (req, res, next) => {
    if (req.userType !== 'restaurant' && req.userType !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
}, restaurantController.updateRestaurant);

/**
 * @swagger
 * /restaurants/{id}:
 *   delete:
 *     tags: [Restaurants]
 *     summary: Delete restaurant by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant deleted successfully
 *       404:
 *         description: Restaurant not found
 */

router.delete('/:id', authenticate, (req, res, next) => {
    if (req.userType !== 'superadmin') {
        return res.status(403).json({ message: 'Only superadmin can delete restaurants' });
    }
    next();
}, restaurantController.deleteRestaurant);

/**
 * @swagger
 * /restaurants/{id}/toggle-active:
 *   patch:
 *     tags: [Restaurants]
 *     summary: Toggle restaurant active status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant active status toggled
 */

router.patch('/:id/toggle-active', authenticate, restaurantController.toggleRestaurantActiveStatus);

// Test route to check restaurant lookup
router.get('/test/:id', restaurantController.testRestaurantLookup);

/**
 * @swagger
 * /restaurants/{id}/revenue:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant revenue statistics
 *     description: Retrieve revenue statistics including daily, weekly, and monthly breakdowns with pagination and cursor-based pagination support.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant's custom ID or ObjectId
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination (ignored if cursor is provided)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (overrides page parameter)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, revenue]
 *           default: date
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter revenue from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter revenue until this date (YYYY-MM-DD)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [day, month, year]
 *           default: day
 *         description: Type of breakdown to return (day, month, or year)
 *     responses:
 *       200:
 *         description: Revenue statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                   description: Total revenue from all orders
 *                 totalCount:
 *                   type: integer
 *                   description: Total number of items in the dataset
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Items per page
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *                     nextCursor:
 *                       type: string
 *                       description: Cursor for fetching the next page of results
 *                 data:
 *                   type: array
 *                   description: Paginated revenue data
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         description: Date in ISO format (YYYY-MM-DD)
 *                       revenue:
 *                         type: number
 *                         description: Total revenue for this period
 *                       orders:
 *                         type: array
 *                         description: Orders that contributed to the revenue
 *                 breakdown:
 *                   type: object
 *                   description: Full breakdown (for backward compatibility)
 *                   properties:
 *                     byDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                     byMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                     byYear:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id/revenue', authenticate, restaurantController.getRestaurantRevenue);

// ===== RESTAURANT ADVANCED ORDERS MANAGEMENT =====

/**
 * @swagger
 * /restaurants/advanced-orders/scheduled:
 *   get:
 *     summary: Get restaurant's scheduled orders
 *     tags: [Restaurants]
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
 *           enum: [scheduled, processing, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *     responses:
 *       200:
 *         description: Scheduled orders retrieved successfully
 */
router.get('/advanced-orders/scheduled', authenticate, restaurantAdvancedOrdersController.getRestaurantScheduledOrders);

/**
 * @swagger
 * /restaurants/advanced-orders/scheduled/{orderId}/status:
 *   put:
 *     summary: Accept or decline a scheduled order
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scheduled order ID
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
 *                 enum: [processing, cancelled]
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation (optional)
 *     responses:
 *       200:
 *         description: Scheduled order status updated successfully
 */
router.put('/advanced-orders/scheduled/:orderId/status', authenticate, restaurantAdvancedOrdersController.updateScheduledOrderStatus);

/**
 * @swagger
 * /restaurants/advanced-orders/scheduled/{orderId}/complete:
 *   put:
 *     summary: Mark scheduled order as completed
 *     tags: [Restaurants]
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
 *         description: Scheduled order marked as completed
 */
router.put('/advanced-orders/scheduled/:orderId/complete', authenticate, restaurantAdvancedOrdersController.markScheduledOrderCompleted);

/**
 * @swagger
 * /restaurants/advanced-orders/group:
 *   get:
 *     summary: Get restaurant's group orders
 *     tags: [Restaurants]
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
 *           enum: [open, ready, confirmed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Group orders retrieved successfully
 */
router.get('/advanced-orders/group', authenticate, restaurantAdvancedOrdersController.getRestaurantGroupOrders);

/**
 * @swagger
 * /restaurants/advanced-orders/group/{orderId}/status:
 *   put:
 *     summary: Accept or decline a group order
 *     tags: [Restaurants]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, declined]
 *               reason:
 *                 type: string
 *                 description: Reason for declining (optional)
 *     responses:
 *       200:
 *         description: Group order status updated successfully
 */
router.put('/advanced-orders/group/:orderId/status', authenticate, restaurantAdvancedOrdersController.updateGroupOrderStatus);

/**
 * @swagger
 * /restaurants/advanced-orders/stats:
 *   get:
 *     summary: Get advanced orders statistics for restaurant dashboard
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Advanced orders statistics retrieved successfully
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
 *                     scheduledOrders:
 *                       type: object
 *                       properties:
 *                         stats:
 *                           type: array
 *                         todaysOrders:
 *                           type: number
 *                     groupOrders:
 *                       type: object
 *                       properties:
 *                         stats:
 *                           type: array
 *                         pendingOrders:
 *                           type: number
 */
router.get('/advanced-orders/stats', authenticate, restaurantAdvancedOrdersController.getAdvancedOrdersStats);

/**
 * @swagger
 * /restaurants/by-university:
 *   get:
 *     summary: Get all restaurants for the authenticated user's university
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of restaurants for the authenticated user's university
 */
router.get('/by-university', authenticateUser, restaurantController.getRestaurantsByUserUniversity);


module.exports = router;
