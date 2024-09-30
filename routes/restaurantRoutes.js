const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantControllers');
const authenticateAdmin = require('../middlewares/authenticate.js')
const authenticate = require('../middlewares/authenticateRestaurant.js');
const authController = require('../controllers/authControllers');

router.get('/mymeals/:customId', restaurantController.getMealsByRestaurant)
router.post('/create', authenticateAdmin, restaurantController.createRestaurant);
router.post('/withdraw', authenticate, restaurantController.createWithdrawal)
router.post('/login', authController.loginRestaurant)
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
