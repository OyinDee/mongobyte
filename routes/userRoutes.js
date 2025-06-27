const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticateUser');
const userControllers = require('../controllers/userControllers');
const restaurantControllers = require('../controllers/restaurantControllers')
const { uploadImage } = require('../controllers/image');

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
router.get('/getProfile', authenticate, userControllers.getProfile);

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
router.put('/updateProfile', authenticate, userControllers.updateUserProfile);

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
router.put('/updateByteBalance', authenticate, userControllers.updateByteBalance);

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
router.get('/restaurants', authenticate, userControllers.getAllRestaurants);

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
router.post('/transfer', authenticate, userControllers.transferBytes)

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
router.get('/orders/:username', userControllers.getUserOrderHistory);

module.exports = router;
