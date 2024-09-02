const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantControllers');

const authenticate = require('../middlewares/authenticateRestaurant.js');


router.post('/create', authenticate, restaurantController.createRestaurant);

router.get('/', restaurantController.getAllRestaurants);

router.get('/:id', restaurantController.getRestaurantById);

router.put('/:id', authenticate, (req, res, next) => {
    if (req.userType !== 'restaurant') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
}, restaurantController.updateRestaurant);


router.delete('/:id', authenticate, (req, res, next) => {
    if (req.userType !== 'restaurant') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
}, restaurantController.deleteRestaurant);


module.exports = router;
