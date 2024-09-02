const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Order = require('../models/Orders');
const Meal = require('../models/Meals');

// Get user profile
exports.getProfile = async (request, response) => {
    const userId = request.user.id; // Assuming user ID is available in request after authentication

    try {
        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        response.json(user);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Verify token
// exports.verifyToken = async (request, response) => {
//     const token = request.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

//     if (!token) {
//         return response.status(401).json({ message: 'No token provided' });
//     }

//     try {
//         // Verify the token
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         // Find user by ID from token payload
//         const user = await User.findById(decoded.id);
//         if (!user) {
//             return response.status(404).json({ message: 'User not found' });
//         }

//         response.json({
//             message: 'Token is valid',
//             user: {
//                 id: user._id,
//                 username: user.username,
//                 email: user.email,
//                 phoneNumber: user.phoneNumber,
//                 byteBalance: user.byteBalance,
//                 bio: user.bio,
//                 orderHistory: user.orderHistory,
//             },
//         });
//     } catch (error) {
//         console.error(error);
//         response.status(401).json({ message: 'Invalid token' });
//     }
// };

// Update user profile
exports.updateProfile = async (request, response) => {
    const userId = request.user.id; // Assuming user ID is available in request after authentication
    const { bio, imageUrl } = request.body;

    try {
        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            { bio, imageUrl },
            { new: true, runValidators: true } // Return the updated document and validate
        );
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        response.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                byteBalance: user.byteBalance,
                bio: user.bio,
                imageUrl: user.imageUrl,
                orderHistory: user.orderHistory,
            },
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Update byte balance
exports.updateByteBalance = async (request, response) => {
    const userId = request.user.id; // Assuming user ID is available in request after authentication
    const { byteBalance } = request.body;

    try {
        // Find and update user
        const user = await User.findByIdAndUpdate(
            userId,
            { byteBalance },
            { new: true, runValidators: true } // Return the updated document and validate
        );
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        response.json({
            message: 'Byte balance updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                byteBalance: user.byteBalance,
                bio: user.bio,
                imageUrl: user.imageUrl,
                orderHistory: user.orderHistory,
            },
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Get all restaurants
exports.getAllRestaurants = async (request, response) => {
    try {
        const restaurants = await Restaurant.find().populate('meals');
        response.json(restaurants);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


