const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealControllers');
const authenticate = require('../middlewares/authenticateRestaurant');

router.post('/:customId/create', mealController.createMeal);

router.get('/', mealController.getAllMeals);

router.get('/:id', mealController.getMealById);

router.put('/:id', authenticate, authenticate, mealController.updateMeal);

router.delete('/:id', authenticate, authenticate, mealController.deleteMeal);

router.post('/restaurant/:restaurantId/batch', authenticate, mealController.addBatchMeals);

module.exports = router;
