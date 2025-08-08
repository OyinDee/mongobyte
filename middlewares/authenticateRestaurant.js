
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurants');

const authenticate = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; 
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Handle new token structure
        if (decoded.type === 'user' && decoded.userId) {
            const user = await User.findById(decoded.userId);
            req.user = user;
            if (user && user.superAdmin) {
                req.userType = 'superadmin';
                return next();
            } else {
                req.userType = 'user';
                return res.status(403).json({ message: 'Access denied for users' });
            }
        }

        if (decoded.type === 'restaurant' && decoded.restaurantId) {
            const restaurant = await Restaurant.findById(decoded.restaurantId);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }
            req.restaurant = restaurant;
            req.user = {
                _id: restaurant._id,
                customId: restaurant.customId,
                type: 'restaurant'
            };
            req.userType = 'restaurant';
            return next();
        }

        // Fallback for old token structure (backward compatibility)
        if (decoded.user) {
            const user = await User.findById(decoded.user._id);
            req.user = user;
            if (user && user.superAdmin) {
                req.userType = 'superadmin';
                return next();
            } else {
                req.userType = 'user';
                return res.status(403).json({ message: 'Access denied for users' });
            }
        }

        if (decoded.restaurant) {
            const restaurant = await Restaurant.findById(decoded.restaurant._id);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }
            req.restaurant = restaurant;
            req.user = {
                _id: restaurant._id,
                customId: restaurant.customId,
                type: 'restaurant'
            };
            req.userType = 'restaurant';
            return next();
        }

        return res.status(401).json({ message: 'Invalid token structure' });
    } catch (error) {
        console.error('Restaurant authentication error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
