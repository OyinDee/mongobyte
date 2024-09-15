const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Order = require('../models/Orders');
const Meal = require('../models/Meals');


exports.getProfile = async (request, response) => {
    const userId = request.user._id; 

    try {
        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }
        response.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                byteBalance: user.byteBalance,
                bio: user.bio,
                imageUrl: user.imageUrl,
                orderHistory: user.orderHistory,
                location: user.location || ''
            },
            token: jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '48h' })
        });
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


exports.updateUserProfile = async (req, res) => {
    try {
      const { bio, location, imageUrl } = req.body;
      const userId = req.user._id; 
      const updateFields = {};
      if (bio !== undefined) updateFields.bio = bio;
      if (location !== undefined) updateFields.location = location;
      if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true } 
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  

exports.updateByteBalance = async (request) => {
    const { user_id, byteFund } = request.body;
  
    try {
      const user = await User.findById(user_id);
      if (!user) {
        throw new Error('User not found');
      }
  
      user.byteBalance += byteFund;
      await user.save();
    } catch (error) {
      console.error('Error updating byte balance:', error);
      throw error; // Propagate error to be handled in verifyPayment
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


// Create a new order
exports.createOrder = async (request, response) => {
    const userId = request.user._id; // Assuming user ID is available in request after authentication
    const { meals } = request.body;

    try {
        // Calculate total price and validate meals
        let totalPrice = 0;
        const mealDetails = await Promise.all(meals.map(async (mealItem) => {
            const meal = await Meal.findById(mealItem.meal);
            if (!meal) {
                throw new Error('Meal not found');
            }
            totalPrice += meal.price * mealItem.quantity;
            return { meal: meal._id, quantity: mealItem.quantity };
        }));

        // Create a new order
        const newOrder = new Order({
            user: userId,
            meals: mealDetails,
            totalPrice,
        });

        await newOrder.save();

        response.status(201).json({
            message: 'Order placed successfully!',
            order: newOrder,
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};
