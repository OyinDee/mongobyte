
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
        response.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = { authenticateUser: authenticate };
