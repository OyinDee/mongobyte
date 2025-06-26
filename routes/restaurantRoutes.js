const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantControllers');
const authenticateAdmin = require('../middlewares/authenticate.js');
const authenticate = require('../middlewares/authenticateRestaurant.js');
const authController = require('../controllers/authControllers');

/**
 * @swagger
 * /restaurants/mymeals/{customId}:
 *   get:
 *     summary: Get meals for a restaurant
 *     parameters:
 *       - in: path
 *         name: customId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of meals
 */

router.get('/mymeals/:customId', restaurantController.getMealsByRestaurant);

/**
 * @swagger
 * /restaurants/create:
 *   post:
 *     summary: Create a restaurant
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
 *         description: Restaurant created successfully
 *       400:
 *         description: Validation error
 */

router.post('/create', authenticateAdmin, restaurantController.createRestaurant);

/**
 * @swagger
 * /restaurants/withdraw:
 *   post:
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
 *     summary: List all restaurants
 *     responses:
 *       200:
 *         description: List of restaurants
 */

router.get('/', restaurantController.getAllRestaurants);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
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
