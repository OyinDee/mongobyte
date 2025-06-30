const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Order = require('../models/Orders');
const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants');
const Notification = require('../models/Notifications');
const University = require('../models/University');

exports.getProfile = async (request, response) => {
    const userId = request.user._id; 

    try {
        const user = await User.findById(userId).populate('university', 'name _id');
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }
        response.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                university: user.university,
                byteBalance: user.byteBalance,
                bio: user.bio,
                imageUrl: user.imageUrl,
                orderHistory: user.orderHistory,
                location: user.location || '',
                nearestLandmark: user.nearestLandmark || ''
            },
            token: jwt.sign({ user }, process.env.JWT_SECRET)
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
      const token = jwt.sign({ user: updatedUser }, process.env.JWT_SECRET)
      res.status(200).json({ 
        message: 'Profile updated successfully', 
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          university: updatedUser.university,
          byteBalance: updatedUser.byteBalance,
          bio: updatedUser.bio,
          imageUrl: updatedUser.imageUrl,
          orderHistory: updatedUser.orderHistory,
          location: updatedUser.location || '',
          nearestLandmark: updatedUser.nearestLandmark || ''
        }, 
        token: token 
      });
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
      throw error; 
    }
  };
  
  


exports.getAllRestaurants = async (request, response) => {
    try {
        let restaurants;
        
        // Check if user is authenticated and has university info
        if (request.user && request.user._id) {
            console.log('Authenticated user requesting restaurants');
            const user = await User.findById(request.user._id);
            
            if (user && user.university) {
                console.log('Filtering restaurants by university:', user.university);
                // Filter restaurants by user's university
                restaurants = await Restaurant.find({ 
                    university: user.university,
                    isActive: true 
                }).populate('meals');
            } else {
                console.log('User found but no university, returning all active restaurants');
                // User exists but no university info, return all active restaurants
                restaurants = await Restaurant.find({ 
                    isActive: true 
                }).populate('meals');
            }
        } else {
            console.log('No authenticated user, returning all active restaurants');
            // No authenticated user, return all active restaurants
            restaurants = await Restaurant.find({ 
                isActive: true 
            }).populate('meals');
        }

        console.log(`Found ${restaurants.length} restaurants`);
        response.json(restaurants);
    } catch (error) {
        console.error('Error in getAllRestaurants:', error);
        response.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Public endpoint to get all active restaurants (no authentication required)
exports.getAllRestaurantsPublic = async (request, response) => {
    try {
        console.log('Public request for all restaurants');
        const restaurants = await Restaurant.find({ 
            isActive: true 
        }).populate('meals');

        console.log(`Found ${restaurants.length} active restaurants`);
        response.json(restaurants);
    } catch (error) {
        console.error('Error in getAllRestaurantsPublic:', error);
        response.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

exports.createOrder = async (request, response) => {
    // const userId = request.user._id;
    // const { meals } = request.body;

    // try {

    //     let totalPrice = 0;
    //     const mealDetails = await Promise.all(meals.map(async (mealItem) => {
    //         const meal = await Meal.findById(mealItem.meal);
    //         if (!meal) {
    //             throw new Error('Meal not found');
    //         }
    //         totalPrice += meal.price * mealItem.quantity;
    //         return { meal: meal._id, quantity: mealItem.quantity };
    //     }));

    //     // Create a new order
    //     const newOrder = new Order({
    //         user: userId,
    //         meals: mealDetails,
    //         totalPrice,
    //     });

    //     await newOrder.save();

    //     response.status(201).json({
    //         message: 'Order placed successfully!',
    //         order: newOrder,
    //     });
    // } catch (error) {
    //     console.error(error);
    //     response.status(500).json({ message: 'Internal server error' });
    // }
};

exports.getUserOrderHistory = async (request, response) => {
    const { username } = request.params;

    try {
const user = await User.findOne({ username })
  .populate({
    path: 'orderHistory',
    populate: {
      path: 'meals.meal',
      model: 'Meal',
    }
  });
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


exports.fetchNotifications = async (request, response) => {
  const token = request.headers.authorization?.split(' ')[1]; 

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

    response.status(200).json({
      message: 'Notifications fetched successfully',
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    response.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.updateUniversity = async (req, res) => {
  try {
    const { universityId } = req.body;
    const userId = req.user._id;

    // Validate the university ID
    if (!universityId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'University ID is required' 
      });
    }

    // Check if university exists and is active
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ 
        status: 'error',
        message: 'University not found' 
      });
    }

    if (!university.isActive) {
      return res.status(400).json({ 
        status: 'error',
        message: 'This university is not currently active on the platform' 
      });
    }

    // Update the user's university
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { university: universityId },
      { new: true }
    ).populate('university', 'name _id');

    if (!updatedUser) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Create a notification for the user
    const notification = new Notification({
      userId: userId,
      message: `You have successfully updated your university to ${university.name}.`
    });
    await notification.save();

    // Generate a new JWT token with updated user info
    const token = jwt.sign({ user: updatedUser }, process.env.JWT_SECRET);

    return res.status(200).json({
      status: 'success',
      message: 'University updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        university: updatedUser.university
      },
      token
    });
  } catch (error) {
    console.error('Error updating university:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Internal server error' 
    });
  }
};


