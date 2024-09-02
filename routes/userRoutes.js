const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticateUser');
const userControllers = require('../controllers/userControllers');
const { uploadImage } = require('../controllers/image');

router.post('/upload', uploadImage);

router.get('/getProfile', authenticate, userControllers.getProfile);
router.post('/updateProfile', authenticate, userControllers.updateProfile);
router.post('/updateByteBalance', authenticate, userControllers.updateByteBalance);
router.get('/restaurants', userControllers.getAllRestaurants);

module.exports = router;
