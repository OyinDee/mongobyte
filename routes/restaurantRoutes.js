const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantControllers');

// Create a new restaurant
router.post('/create', restaurantController.createRestaurant);

// Get all restaurants
router.get('/', restaurantController.getAllRestaurants);

// Get a single restaurant by customId
router.get('/:id', restaurantController.getRestaurantById);

// Update a restaurant by customId
router.put('/:id', restaurantController.updateRestaurant);

// Delete a restaurant by customId
router.delete('/:id', restaurantController.deleteRestaurant);

module.exports = router;
