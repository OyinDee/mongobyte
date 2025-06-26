const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authenticate = require('../middlewares/authenticate');
const restaurantController = require('../controllers/restaurantControllers')

/**
 * @swagger
 * /superadmin/restaurants:
 *   post:
 *     summary: Create a restaurant (Super Admin)
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

router.post('/restaurants', authenticate, restaurantController.createRestaurant);

/**
 * @swagger
 * /superadmin/restaurants/{id}:
 *   delete:
 *     summary: Delete a restaurant (Super Admin)
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

router.delete('/restaurants/:id', authenticate, superAdminController.deleteRestaurant);

/**
 * @swagger
 * /superadmin/allrestaurants:
 *   get:
 *     summary: List all restaurants (Super Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of restaurants
 */

router.get('/allrestaurants', authenticate, restaurantController.getAllRestaurants)

/**
 * @swagger
 * /superadmin/restaurants/{id}:
 *   get:
 *     summary: Get restaurant by ID (Super Admin)
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
 *         description: Restaurant details
 *       404:
 *         description: Restaurant not found
 */

router.get('/restaurants/:id', authenticate, superAdminController.getRestaurantById);

/**
 * @swagger
 * /superadmin/orders:
 *   get:
 *     summary: List all orders (Super Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */

router.get('/orders', authenticate, superAdminController.getAllOrders);

/**
 * @swagger
 * /superadmin/orders/{orderId}:
 *   get:
 *     summary: Get order by ID (Super Admin)
 *     security:
 *       - bearerAuth: []
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

router.get('/orders/:orderId', authenticate, superAdminController.getOrderById);

module.exports = router;
