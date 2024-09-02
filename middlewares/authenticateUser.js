// middleware/authenticate.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurants');

const authenticate = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify the token
        console.log(token)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded)
        // Find user or restaurant by ID from token payload
        const user = await User.findById(decoded._id);
        const restaurant = await Restaurant.findById(decoded._id);

        if (user) {
            req.user = user; // Attach user info to request object
            req.userType = 'user'; // Specify user type
            return next();
        }

        if (restaurant) {
            req.restaurant = restaurant; // Attach restaurant info to request object
            req.userType = 'restaurant'; // Specify user type
            return res.status(403).json({ message: 'Access denied for restaurants' });
        }

        // If neither user nor restaurant is found
        return res.status(404).json({ message: 'User or restaurant not found' });
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
