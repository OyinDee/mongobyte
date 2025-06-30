const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealControllers');
const authenticate = require('../middlewares/authenticateRestaurant');

console.log('mealControllers.js loaded');

/**
 * @swagger
 * tags:
 *   name: Meals
 *   description: Meal management and operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Meal:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - tag
 *         - per
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the meal
 *         description:
 *           type: string
 *           description: Detailed description of the meal
 *         price:
 *           type: number
 *           description: Price of the meal
 *         tag:
 *           type: string
 *           description: Category or type of meal
 *         per:
 *           type: string
 *           description: Serving size or quantity (e.g., "per plate", "per portion")
 *         imageUrl:
 *           type: string
 *           description: URL to the meal's image
 *       example:
 *         name: "Jollof Rice"
 *         description: "Spicy Nigerian jollof rice with chicken"
 *         price: 1500
 *         tag: "Rice"
 *         per: "plate"
 *         imageUrl: "https://example.com/jollof.jpg"
 */

/**
 * @swagger
 * /meals/me:
 *   get:
 *     tags: [Meals]
 *     summary: Get meals for the authenticated restaurant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of meals for the authenticated restaurant
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meal'
 *       401:
 *         description: Unauthorized - Not a restaurant account
 */
router.get('/me', authenticate, mealController.getRestaurantMeals);

/**
 * @swagger
 * /meals/{customId}/create:
 *   post:
 *     tags: [Meals]
 *     summary: Add a new meal to a restaurant (by customId or ObjectId)
 *     description: Create a new meal for a specific restaurant using either customId or ObjectId (Restaurant auth required)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant's custom ID or ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Meal'
 *     responses:
 *       201:
 *         description: Meal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 meal:
 *                   $ref: '#/components/schemas/Meal'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Not a restaurant account
 */
router.post('/:customId/create', authenticate, mealController.createMeal);

/**
 * @swagger
 * /meals:
 *   get:
 *     tags: [Meals]
 *     summary: List all meals
 *     description: Retrieve a list of all available meals
 *     responses:
 *       200:
 *         description: List of meals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meal'
 */
router.get('/', mealController.getAllMeals);

/**
 * @swagger
 * /meals/notifications:
 *   get:
 *     tags: [Meals]
 *     summary: Get notifications for the authenticated restaurant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications for the authenticated restaurant
 *       401:
 *         description: Unauthorized - Not a restaurant account
 */
router.get('/notifications', authenticate, mealController.getRestaurantNotifications);

/**
 * @swagger
 * /meals/{id}:
 *   get:
 *     tags: [Meals]
 *     summary: Get meal by ID (customId or ObjectId)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meal's custom ID or ObjectId
 *     responses:
 *       200:
 *         description: Meal details
 *       404:
 *         description: Meal not found
 */
router.get('/:id', mealController.getMealById);

/**
 * @swagger
 * /meals/{id}:
 *   put:
 *     tags: [Meals]
 *     summary: Update meal by ID
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               tag:
 *                 type: string
 *               per:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meal updated successfully
 *       400:
 *         description: Validation error
 */
router.put('/:id', authenticate, authenticate, mealController.updateMeal);

/**
 * @swagger
 * /meals/{id}:
 *   delete:
 *     tags: [Meals]
 *     summary: Delete meal by ID
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
 *         description: Meal deleted successfully
 *       404:
 *         description: Meal not found
 */
router.delete('/:id', authenticate, authenticate, mealController.deleteMeal);

/**
 * @swagger
 * /meals/batch:
 *   post:
 *     tags: [Meals]
 *     summary: Add multiple meals to a restaurant in a batch
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantId:
 *                 type: string
 *               meals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     price:
 *                       type: number
 *                     tag:
 *                       type: string
 *                     per:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *     responses:
 *       201:
 *         description: Batch meals added successfully
 *       400:
 *         description: Validation error
 */
router.post('/batch', authenticate, mealController.addBatchMeals);

module.exports = router;
