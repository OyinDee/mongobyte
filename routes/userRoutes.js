const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authenticateUser');
const userControllers = require('../controllers/userControllers');
const restaurantControllers = require('../controllers/restaurantControllers')
const superAdminController = require('../controllers/superAdminController')
const { transferLimiter, financialOperationsLimiter } = require('../middlewares/rateLimiter');
const { transactionLock } = require('../middlewares/transactionLock');
const { concurrencyGuard } = require('../middlewares/concurrencyGuard');
const { 
  sanitizeInput, 
  transferValidation, 
  profileUpdateValidation,
  usernameParamValidation,
  balanceAccessControl,
  handleValidationErrors, 
  sanitizeAmount, 
  securityChecks 
} = require('../middlewares/inputValidation');
const { balanceCheckRateLimit } = require('../middlewares/security');

/**
 * @swagger
 * /users/revenue/restaurant/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get total and breakdown revenue for a restaurant
 *     description: Returns total revenue and breakdown (by day, month, year) for a specific restaurant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID (customId or ObjectId)
 *     responses:
 *       200:
 *         description: Revenue data
 *         content:
 *           application/json:
 *             schema:
 *
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                 breakdown:
 *                   type: object
 *                   properties:
 *                     byDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                     byMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                     byYear:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: string
 *                           revenue:
 *                             type: number
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Server error
 */
router.get('/revenue/restaurant/:id', restaurantControllers.getRestaurantRevenue);

/**
 * @swagger
 * /users/revenue/global:
 *   get:
 *     tags: [Users]
 *     summary: Get total and breakdown revenue for all restaurants (global)
 *     description: Returns total revenue and breakdown (by day, month, year) for all orders
 *     responses:
 *       200:
 *         description: Revenue data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                 breakdown:
 *                   type: object
 *                   properties:
 *                     byDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                     byMonth:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           revenue:
 *                             type: number
 *                     byYear:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: string
 *                           revenue:
 *                             type: number
 *       500:
 *         description: Server error
 */
router.get('/revenue/global', superAdminController.getGlobalRevenue);
const { uploadImage } = require('../controllers/image');
/**
 * @swagger
 * /users/balance/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user balance by username (Protected)
 *     description: Get a user's byte balance by their username. Users can only check their own balance unless they are super admins.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9_]{3,50}$'
 *         description: Username of the user to get balance for (3-50 characters, alphanumeric + underscore)
 *     responses:
 *       200:
 *         description: User balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 balance:
 *                   type: number
 *       400:
 *         description: Invalid username format
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - can only check own balance
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/balance/:username', 
  sanitizeInput,
  balanceCheckRateLimit,
  authenticateUser,
  usernameParamValidation,
  handleValidationErrors,
  balanceAccessControl,
  userControllers.getUserBalanceByUsername
);

/**
 * @swagger
 * /users/notifications/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get notifications by username (public)
 *     description: Fetch all notifications for a user by their username. Public endpoint, no authentication required.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username to fetch notifications for
 *     responses:
 *       200:
 *         description: Notifications fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Username is required
 *       404:
 *         description: User not found
 *       500:
 *         description: Error fetching notifications
 */
const authenticateSuperAdmin = require('../middlewares/authenticate');
router.get('/notifications/:username', authenticateSuperAdmin, userControllers.getNotificationsByUsername);


/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management and operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         university:
 *           type: string
 *         address:
 *           type: string
 *         bio:
 *           type: string
 *         imageUrl:
 *           type: string
 *         byteBalance:
 *           type: number
 */

/**
 * @swagger
 * /users/upload:
 *   post:
 *     tags: [Users]
 *     summary: Upload a profile image
 *     description: Upload a new profile image for the user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Validation errors
 */
router.post('/upload', uploadImage);

/**
 * @swagger
 * /users/getProfile:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     description: Retrieve the profile of the logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns user profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized access
 */
router.get('/getProfile', authenticateUser, userControllers.getProfile);

/**
 * @swagger
 * /users/updateProfile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Update user profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               university:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns a success message and updated user profile
 *       400:
 *         description: Validation errors
 */
router.put('/updateProfile', sanitizeInput, authenticateUser, profileUpdateValidation, handleValidationErrors, userControllers.updateUserProfile);

/**
 * @swagger
 * /users/updateByteBalance:
 *   put:
 *     tags: [Users]
 *     summary: Update byte balance
 *     description: Update user byte balance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *               byteFund:
 *                 type: number
 *     responses:
 *       200:
 *         description: Byte balance updated
 *       400:
 *         description: Validation errors
 */
router.put('/updateByteBalance', authenticateUser, userControllers.updateByteBalance);

/**
 * @swagger
 * /users/restaurants:
 *   get:
 *     tags: [Users]
 *     summary: List all restaurants
 *     description: List all active restaurants. If authenticated, filters by user's university.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns a list of restaurants
 */
router.get('/restaurants', authenticateUser, userControllers.getAllRestaurants);

/**
 * @swagger
 * /users/restaurants/public:
 *   get:
 *     tags: [Users]
 *     summary: List all active restaurants (public)
 *     description: Public endpoint to list all active restaurants without authentication
 *     responses:
 *       200:
 *         description: Returns a list of active restaurants
 */
router.get('/restaurants/public', userControllers.getAllRestaurantsPublic);

/**
 * @swagger
 * /users/transfer:
 *   post:
 *     tags: [Users]
 *     summary: Transfer bytes
 *     description: Transfer bytes to another user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipientUsername:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Transfer successful
 *       400:
 *         description: Validation errors
 */
router.post('/transfer', 
  sanitizeInput,
  authenticateUser, 
  concurrencyGuard('transfer'),
  transferLimiter,
  financialOperationsLimiter,
  transferValidation,
  handleValidationErrors,
  sanitizeAmount,
  securityChecks,
  transactionLock('transfer'),
  userControllers.transferBytes
)

/**
 * @swagger
 * /users/restdetails/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get restaurant details
 *     description: Get restaurant details by ID
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
router.get('/restdetails/:id', restaurantControllers.getRestaurantById)

/**
 * @swagger
 * /users/notifications:
 *   get:
 *     tags: [Users]
 *     summary: Get user notifications
 *     description: Get user notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/notifications', userControllers.fetchNotifications);

/**
 * @swagger
 * /users/updateUniversity:
 *   put:
 *     tags: [Users]
 *     summary: Update user's university
 *     description: Change the university associated with the user's account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - universityId
 *             properties:
 *               universityId:
 *                 type: string
 *                 description: The ID of the university to change to
 *     responses:
 *       200:
 *         description: University updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: University updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     university:
 *                       type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid input or inactive university
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: University or user not found
 *       500:
 *         description: Server error
 */
router.put('/updateUniversity', authenticateUser, userControllers.updateUniversity);

/**
 * @swagger
 * /users/orders/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user order history
 *     description: Get user order history by username
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/orders/:username', authenticateSuperAdmin, userControllers.getUserOrderHistory);

/**
 * @swagger
 * /users/my-orders:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's order history
 *     description: Get the order history for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of orders per page
 *     responses:
 *       200:
 *         description: Order history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 */
router.get('/my-orders', authenticateUser, userControllers.getMyOrders);

/**
 * @swagger
 * /users/my-notifications:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's notifications
 *     description: Get notifications for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of notifications per page
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only return unread notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/my-notifications', authenticateUser, userControllers.getMyNotifications);

/**
 * @swagger
 * /users/referral/generate:
 *   post:
 *     tags: [Users]
 *     summary: Generate a referral code
 *     description: Generate a personal referral code for inviting friends
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Referral code generated successfully
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
 *                     _id:
 *                       type: string
 *                     referralCode:
 *                       type: string
 *                     rewardAmount:
 *                       type: number
 *                     bonusAmount:
 *                       type: number
 *                     totalUses:
 *                       type: number
 *                     maxUses:
 *                       type: number
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     isActive:
 *                       type: boolean
 *       200:
 *         description: Existing referral code returned
 */
router.post('/referral/generate', authenticateUser, userControllers.generateReferralCode);

/**
 * @swagger
 * /users/referral/use:
 *   post:
 *     tags: [Users]
 *     summary: Use a referral code
 *     description: Apply a referral code to receive rewards
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referralCode
 *             properties:
 *               referralCode:
 *                 type: string
 *                 description: The referral code to use
 *     responses:
 *       200:
 *         description: Referral code applied successfully
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
 *                     rewardEarned:
 *                       type: number
 *                     newBalance:
 *                       type: number
 *                     referrerBonus:
 *                       type: number
 *       400:
 *         description: Invalid referral code or cannot use own code
 *       404:
 *         description: Referral code not found or expired
 */
router.post('/referral/use', authenticateUser, userControllers.useReferralCode);

/**
 * @swagger
 * /users/delivery-info/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user delivery information by username
 *     description: Retrieves delivery information (location, phone, etc.) for a user by their username. Used when ordering food for someone else.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the user to get delivery info for
 *     responses:
 *       200:
 *         description: User delivery information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     location:
 *                       type: string
 *                     nearestLandmark:
 *                       type: string
 *                     hasDeliveryInfo:
 *                       type: boolean
 *       404:
 *         description: User not found
 *       400:
 *         description: Username is required
 */
router.get('/delivery-info/:username', userControllers.getUserDeliveryInfo);

module.exports = router;
