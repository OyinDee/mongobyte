const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Order = require('../models/Orders');
const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants')
const Notification = require('../models/Notifications');

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
                location: user.location || '',
                nearestLandmark: user. nearestLandmark || ''
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
      const { bio, location, imageUrl,  nearestLandmark } = req.body;
      const userId = req.user._id; 
      const updateFields = {};
      if (bio !== undefined) updateFields.bio = bio;
      if (location !== undefined) updateFields.location = location;
      if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
      if ( nearestLandmark !== undefined) updateFields. nearestLandmark =  nearestLandmark;
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true } 
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      const token = jwt.sign({ user: updatedUser }, process.env.JWT_SECRET, { expiresIn: '48h' })
      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser, token:token });
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
      throw error; //
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

exports.getUserOrderHistory = async (request, response) => {
    const { userId } = request.params;

    try {
        const user = await User.findById(userId).populate('orderHistory');
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        return response.json(user.orderHistory);
    } catch (error) {
        console.error(error);
        return response.status(500).json({ message: 'Internal server error' });
    }
};


exports.transferBytes = async (request, response) => {
  const { recipientUsername, amount } = request.body;
  const senderId = request.user._id;

  try {
    if (amount <= 0) {
      return response.status(400).json({ message: 'Transfer amount must be greater than zero' });
    }

    const sender = await User.findById(senderId);
    if (!sender) {
      return response.status(404).json({ message: 'Sender not found' });
    }

    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      return response.status(404).json({ message: 'Recipient not found' });
    }

    if (sender.byteBalance < amount) {
      return response.status(400).json({ message: 'Insufficient byte balance' });
    }

    sender.byteBalance -= amount;
    recipient.byteBalance += amount;

    await sender.save();
    await recipient.save();


    response.status(200).json({
      message: `Successfully transferred ${amount} bytes to ${recipient.username}`,
      sender: { username: sender.username, byteBalance: sender.byteBalance },
      recipient: { username: recipient.username, byteBalance: recipient.byteBalance },
    });

    setImmediate(async () => {
      try {
        const senderNotification = new Notification({
          userId: sender._id,
          message: `You successfully transferred ${amount} bytes to ${recipient.username}.`,
        });
        await senderNotification.save();

        const recipientNotification = new Notification({
          userId: recipient._id,
          message: `You have received ${amount} bytes from ${sender.username}.`,
        });
        await recipientNotification.save();
      } catch (error) {
        console.error('Error creating notifications:', error);
      }
    });

  } catch (error) {
    console.error('Error during byte transfer:', error);
    response.status(500).json({ message: 'Internal server error' });
  }
};


const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification'); 

exports.fetchNotifications = async (request, response) => {
  const token = request.headers.authorization?.split(' ')[1]; // Extract token from the Authorization header

  if (!token) {
    return response.status(401).json({ message: 'No token provided' });
  }

  try {

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    let userId;
    let restaurantId;

    if (decodedToken.user) {
      userId = decodedToken.user._id; 
    } else if (decodedToken.restaurant) {
      restaurantId = decodedToken.restaurant._id; 
    }

    if (!userId && !restaurantId) {
      return response.status(400).json({ message: 'Invalid token data' });
    }


    const notifications = await Notification.find(userId ? { userId } : { restaurantId })
      .sort({ createdAt: -1 })
      .limit(10) 
      .skip((request.query.page - 1) * 10); 

    response.status(200).json({
      message: 'Notifications fetched successfully',
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    response.status(500).json({ message: 'Error fetching notifications' });
  }
};

  