const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticateUser');
const userControllers = require('../controllers/userControllers');
const restaurantControllers = require('../controllers/restaurantControllers')
const { uploadImage } = require('../controllers/image');

router.post('/upload', uploadImage);

router.get('/getProfile', authenticate, userControllers.getProfile);
router.post('/updateProfile', authenticate, userControllers.updateUserProfile);
router.post('/updateByteBalance', authenticate, userControllers.updateByteBalance);
router.get('/restaurants', userControllers.getAllRestaurants);
router.post('/transfer', authenticate, userControllers.transferBytes)
router.get('/restdetails/:id', restaurantControllers.getRestaurantById)
router.get('/notifications', userControllers.fetchNotifications);
router.get('/orders/:username', userControllers.getUserOrderHistory);

module.exports = router;
