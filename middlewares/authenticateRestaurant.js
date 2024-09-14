
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

        const user = await User.findById(decoded.user._id);
        const restaurant = await Restaurant.findById(decoded.restaurant._id);

        if (user) {
            req.user = user; 
            req.userType = 'user'; 
            return res.status(403).json({ message: 'Access denied for users' });
        }

        if (restaurant) {
            req.restaurant = restaurant;
            req.userType = 'restaurant'; 
            return next();
        }

        if(!user || !restaurant){
            return res.status(404).json({ message: 'User or restaurant not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
