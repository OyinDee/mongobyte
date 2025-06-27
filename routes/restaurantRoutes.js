const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantControllers');
const authenticateAdmin = require('../middlewares/authenticate.js');
const authenticate = require('../middlewares/authenticateRestaurant.js');
const authController = require('../controllers/authControllers');

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management and operations
 */

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
    if (req.userType !== 'restaurant') {
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
    if (req.userType !== 'restaurant') {
        return res.status(403).json({ message: 'Access denied' });
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

module.exports = router;
