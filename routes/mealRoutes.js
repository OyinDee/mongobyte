const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealControllers');

// Create a new meal for a specific restaurant
router.post('/create/:restaurantId', mealController.createMeal);

// Get all meals
router.get('/', mealController.getAllMeals);

// Get a single meal by customId
router.get('/:id', mealController.getMealById);

// Update a meal by customId
router.put('/:id', mealController.updateMeal);

// Delete a meal by customId
router.delete('/:id', mealController.deleteMeal);

// Add batch meals for a specific restaurant
router.post('/batch/:restaurantId', mealController.addBatchMeals);

module.exports = router;
