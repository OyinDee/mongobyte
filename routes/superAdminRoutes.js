const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authenticate = require('../middlewares/authenticate');
const restaurantController = require('../controllers/restaurantControllers')

router.post('/restaurants', authenticate, restaurantController.createRestaurant);

router.delete('/restaurants/:id', authenticate, superAdminController.deleteRestaurant);

router.get('/allrestaurants', authenticate, restaurantController.getAllRestaurants)

router.get('/restaurants/:id', authenticate, superAdminController.getRestaurantById);

router.get('/orders', authenticate, superAdminController.getAllOrders);

router.get('/orders/:orderId', authenticate, superAdminController.getOrderById);

module.exports = router;
