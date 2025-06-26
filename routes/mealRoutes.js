const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealControllers');
const authenticate = require('../middlewares/authenticateRestaurant');

/**
 * @swagger
 * /meals/{customId}/create:
 *   post:
 *     summary: Add a new meal to a restaurant
 *     parameters:
 *       - in: path
 *         name: customId
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
 *       201:
 *         description: Meal created successfully
 *       400:
 *         description: Validation error
 */

router.post('/:customId/create', mealController.createMeal);

/**
 * @swagger
 * /meals:
 *   get:
 *     summary: List all meals
 *     responses:
 *       200:
 *         description: List of meals
 */

router.get('/', mealController.getAllMeals);

/**
 * @swagger
 * /meals/{id}:
 *   get:
 *     summary: Get meal by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
