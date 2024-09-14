// middleware/authenticate.js
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


        const user = await User.findById(decoded.user._id);
        const restaurant = await Restaurant.findById(decoded.restaurant._id);

        if (user) {
            request.user = user;
            request.userType = 'user'; 
            return next();
        }

        if (restaurant) {
            request.restaurant = restaurant; 
            request.userType = 'restaurant'; 
            return response.status(403).json({ message: 'Access denied for restaurants' });
        }

        if(!user || !restaurant){
            return response.status(404).json({ message: 'User or restaurant not found' });
        }
    } catch (error) {
        console.error(error);
        response.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
