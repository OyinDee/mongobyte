
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurants');

const authenticate = async (request, response, next) => {
    const token = request.headers['authorization']?.split(' ')[1]; 

    if (!token) {
        return response.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Handle new token structure with userId and type
        if (decoded.type === 'user' && decoded.userId) {
            const user = await User.findById(decoded.userId);
            if (!user) {
                return response.status(404).json({ message: 'User not found' });
            }
            request.user = user; 
            request.userType = 'user'; 
            return next();
        }
        
        // Handle new token structure for restaurants
        if (decoded.type === 'restaurant' && decoded.restaurantId) {
            const restaurant = await Restaurant.findById(decoded.restaurantId);
            if (!restaurant) {
                return response.status(404).json({ message: 'Restaurant not found' });
            }
            request.restaurant = restaurant;
            request.userType = 'restaurant'; 
            return response.status(403).json({ message: 'Access denied for restaurants' });
        }

        // Fallback for old token structure (backward compatibility)
        if (decoded.user) {
            const user = await User.findById(decoded.user._id);
            if (!user) {
                return response.status(404).json({ message: 'User not found' });
            }
            request.user = user; 
            request.userType = 'user'; 
            return next();
        }
        
        if (decoded.restaurant) {
            const restaurant = await Restaurant.findById(decoded.restaurant._id);
            if (!restaurant) {
                return response.status(404).json({ message: 'Restaurant not found' });
            }
            request.restaurant = restaurant;
            request.userType = 'restaurant'; 
            return response.status(403).json({ message: 'Access denied for restaurants' });
        }

        return response.status(401).json({ message: 'Invalid token structure' });
    } catch (error) {
        console.error('Authentication error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return response.status(401).json({ message: 'Token expired' });
        }
        response.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = { authenticateUser: authenticate };
