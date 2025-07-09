const express = require('express');
const router = express.Router();
const { getRestaurantNotifications } = require('../controllers/restaurantControllers');
const authenticate = require('../middlewares/authenticateRestaurant');
const authenticateUser = require('../middlewares/authenticateUser');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management for restaurants and users
 */

/**
 * @swagger
 * /notifications/restaurant:
 *   get:
 *     tags: [Notifications]
 *     summary: Get restaurant notifications
 *     description: Retrieves all notifications for the authenticated restaurant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   restaurantId:
 *                     type: string
 *                   message:
 *                     type: string
 *                   read:
 *                     type: boolean
 *                   type:
 *                     type: string
 *                   relatedId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - Not a restaurant account
 */
router.get('/restaurant', authenticate, getRestaurantNotifications);

module.exports = router;
