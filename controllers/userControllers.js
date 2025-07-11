// Get user balance by username
exports.getUserBalanceByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check if username is provided
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    // Find the user by username
    const user = await User.findOne({ username }, 'username byteBalance');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user's balance
    res.status(200).json({
      username: user.username,
      balance: user.byteBalance
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ message: 'Error fetching user balance', error: error.message });
  }
};

// Public endpoint to fetch notifications by username
exports.getNotificationsByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Notifications fetched successfully',
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications by username:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Order = require('../models/Orders');
const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants');
const Notification = require('../models/Notifications');
const University = require('../models/University');
const sendEmail = require('../configs/nodemailer');

exports.getProfile = async (request, response) => {
    const userId = request.user._id; 

    try {
        const user = await User.findById(userId).populate('university', 'name _id');
        if (!user) {
            return response.status(404).json({ message: 'User not found' });
        }

        // Handle case where university might still be null/undefined
        let universityInfo = user.university;
        if (!universityInfo) {
            // Find default university for users migrated from old schema
            const defaultUniversity = await University.findOne({ name: 'Default University' });
            if (defaultUniversity) {
                // Update user with default university
                await User.findByIdAndUpdate(userId, { university: defaultUniversity._id });
                universityInfo = {
                    _id: defaultUniversity._id,
                    name: defaultUniversity.name
                };
            }
        }

        response.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                university: universityInfo,
                byteBalance: user.byteBalance,
                bio: user.bio,
                imageUrl: user.imageUrl,
                location: user.location || '',
                nearestLandmark: user.nearestLandmark || '',
                isVerified: user.isVerified,
                superAdmin: user.superAdmin,
                orderItems: user.orderHistory ? user.orderHistory.length : 0
            },
            token: jwt.sign({ user }, process.env.JWT_SECRET)
        });
    } catch (error) {
        console.error('Get profile error:', error);
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
      const { bio, location, imageUrl, nearestLandmark, university } = req.body;
      const userId = req.user._id; 
      const updateFields = {};
      if (bio !== undefined) updateFields.bio = bio;
      if (location !== undefined) updateFields.location = location;
      if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
      if (nearestLandmark !== undefined) updateFields.nearestLandmark = nearestLandmark;

      // Add university to updateFields if present
      if (university !== undefined) {
        updateFields.university = university;
        console.log('University update requested:', university, 'Type:', typeof university);
      }

      // Update the user in the database
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
      ).populate('university', 'name _id');

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Send email notification if university was updated
      if (university !== undefined) {
        const emailHtml = `<html><head><style>body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FFFFFF; color: #000000; margin: 0; padding: 0; }.email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }.header { text-align: center; padding: 40px 20px 30px; background: #990000; color: #FFFFFF; }.header h1 { margin: 0; font-size: 28px; font-weight: 600; }.content { padding: 40px 30px; line-height: 1.6; }.update-info { background-color: #FFCC00; border-left: 4px solid #990000; padding: 20px; margin: 20px 0; border-radius: 4px; color: #000000; }.footer { text-align: center; padding: 30px; background-color: #FFFFFF; color: #990000; font-size: 14px; }.brand { color: #990000; font-weight: 600; }</style></head><body><div class="email-container"><div class="header"><h1>Profile Updated! ✅</h1></div><div class="content"><p>Hi ${updatedUser.username}! 👋</p><p>Great news! Your profile has been successfully updated. Here's what changed:</p><div class="update-info">${university ? `<p><strong>🏫 University:</strong> ${updatedUser.university?.name || 'Updated'}</p>` : ''}${bio !== undefined ? `<p><strong>📝 Bio:</strong> ${bio || 'Cleared'}</p>` : ''}${location !== undefined ? `<p><strong>📍 Location:</strong> ${location || 'Cleared'}</p>` : ''}${nearestLandmark !== undefined ? `<p><strong>🗺️ Nearest Landmark:</strong> ${nearestLandmark || 'Cleared'}</p>` : ''}${imageUrl !== undefined ? `<p><strong>📸 Profile Picture:</strong> Updated</p>` : ''}</div><p>Your profile is now more complete and will help you get a better experience on our platform! 🎉</p><p>Ready to order some delicious food? Let's go! 🍕</p></div><div class="footer"><p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p><p>Keeping your profile fresh! 😋</p></div></div></body></html>`;
        // Send email notification (non-blocking)
        setImmediate(async () => {
          try {
            await sendEmail(updatedUser.email, 'Profile Updated Successfully', 'Your profile has been updated.', emailHtml);
          } catch (emailError) {
            console.error('Error sending profile update email:', emailError);
          }
        });
      }

      // Create in-app notification
      setImmediate(async () => {
        try {
          const changes = [];
          if (university !== undefined) changes.push('university');
          if (bio !== undefined) changes.push('bio');
          if (location !== undefined) changes.push('location');
          if (nearestLandmark !== undefined) changes.push('nearest landmark');
          if (imageUrl !== undefined) changes.push('profile picture');
          const notification = new Notification({
            userId: userId,
            message: `Your profile has been updated successfully! Changes: ${changes.join(', ')}.`
          });
          await notification.save();
        } catch (notificationError) {
          console.error('Error creating profile update notification:', notificationError);
        }
      });

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
          location: updatedUser.location || '',
          nearestLandmark: updatedUser.nearestLandmark || '',
          isVerified: updatedUser.isVerified,
          superAdmin: updatedUser.superAdmin,
          orderItems: updatedUser.orderHistory ? updatedUser.orderHistory.length : 0
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
    // Use authenticated user instead of username from params for security
    const userId = request.user._id;

    try {
        const user = await User.findById(userId)
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

        // Send email notifications
        if (sender.email) {
          const senderEmailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #FFFFFF;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: #990000;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .transfer-info {
      background-color: #FFCC00;
      border-left: 4px solid #990000;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      color: #000000;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #FFFFFF;
      color: #990000;
      font-size: 14px;
    }
    .brand {
      color: #990000;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Bytes Sent! 💸</h1>
    </div>
    <div class="content">
      <p>Hi ${sender.username}! 👋</p>
      <p>You have successfully transferred bytes to another user. Here are the details:</p>
      <div class="transfer-info">
        <p><strong>💰 Amount Sent:</strong> ${amount} bytes</p>
        <p><strong>👤 Recipient:</strong> ${recipient.username}</p>
        <p><strong>💳 Your New Balance:</strong> ${sender.byteBalance} bytes</p>
      </div>
      <p>Thank you for using Byte to share with your friends! 🤝</p>
      <p>Ready to order some food? Let's go! 🍕</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Sharing made easy! 😋</p>
    </div>
  </div>
</body>
</html>
          `;
          await sendEmail(sender.email, 'Bytes Transfer Confirmation', 'You have successfully sent bytes.', senderEmailHtml);
        }

        if (recipient.email) {
          const recipientEmailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #FFFFFF;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: #990000;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .transfer-info {
      background-color: #FFCC00;
      border-left: 4px solid #990000;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      color: #000000;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #FFFFFF;
      color: #990000;
      font-size: 14px;
    }
    .brand {
      color: #990000;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Bytes Received! 💰</h1>
    </div>
    <div class="content">
      <p>Hi ${recipient.username}! 👋</p>
      <p>Great news! You have received bytes from another user. Here are the details:</p>
      <div class="transfer-info">
        <p><strong>💰 Amount Received:</strong> ${amount} bytes</p>
        <p><strong>👤 From:</strong> ${sender.username}</p>
        <p><strong>💳 Your New Balance:</strong> ${recipient.byteBalance} bytes</p>
      </div>
      <p>Your account has been credited! Time to treat yourself to some delicious food! 🎉</p>
      <p>Ready to place an order? Let's go! 🍕</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Receiving made sweet! 😋</p>
    </div>
  </div>
</body>
</html>
          `;
          await sendEmail(recipient.email, 'Bytes Received!', 'You have received bytes from another user.', recipientEmailHtml);
        }
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

// Update user university
exports.updateUserUniversity = async (req, res) => {
    try {
        const { university } = req.body;
        const userId = req.user._id;

        if (!university) {
            return res.status(400).json({ message: 'University ID is required' });
        }

        // Verify university exists
        const universityExists = await University.findById(university);
        if (!universityExists) {
            return res.status(404).json({ message: 'University not found' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { university: university } },
            { new: true }
        ).populate('university', 'name _id');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign({ user: updatedUser }, process.env.JWT_SECRET);

        res.status(200).json({
            message: 'University updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                phoneNumber: updatedUser.phoneNumber,
                university: updatedUser.university,
                byteBalance: updatedUser.byteBalance,
                bio: updatedUser.bio,
                imageUrl: updatedUser.imageUrl,
                location: updatedUser.location || '',
                nearestLandmark: updatedUser.nearestLandmark || '',
                isVerified: updatedUser.isVerified,
                superAdmin: updatedUser.superAdmin
            },
            token: token
        });
    } catch (error) {
        console.error('Error updating user university:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: 'orderHistory',
        populate: [
          {
            path: 'meals.meal',
            model: 'Meal',
            select: 'name price imageUrl'
          },
          {
            path: 'restaurant',
            model: 'Restaurant',
            select: 'name location imageUrl'
          }
        ],
        options: {
          sort: { createdAt: -1 },
          skip: skip,
          limit: parseInt(limit)
        }
      });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const totalOrders = user.orderHistory.length;
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      success: true,
      data: {
        orders: user.orderHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalOrders,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching orders',
      error: error.message 
    });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    let filter = { userId: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching notifications',
      error: error.message 
    });
  }
};

// Generate referral code
exports.generateReferralCode = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        // Check if user already has an active referral code
        const { Referral } = require('../models/AdvancedOrders');
        const { generateId } = require('../utils/generateID');

        let existingReferral = await Referral.findOne({
            referrer: userId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (existingReferral) {
            return res.status(200).json({
                success: true,
                data: {
                    referralCode: existingReferral.referralCode,
                    expiresAt: existingReferral.expiresAt,
                    rewardAmount: existingReferral.rewardAmount,
                    bonusAmount: existingReferral.bonusAmount,
                    totalUses: existingReferral.totalUses || 0,
                    maxUses: existingReferral.maxUses,
                    isActive: existingReferral.status === 'pending'
                }
            });
        }

        // Generate new referral code
        const referralCode = `${user.username.toUpperCase()}-${generateId().substring(0, 6)}`;

        const referral = new Referral({
            referrer: userId,
            referralCode,
            status: 'pending'
        });

        await referral.save();

        res.status(201).json({
            success: true,
            message: 'Referral code generated successfully',
            data: {
                _id: referral._id,
                referralCode: referral.referralCode,
                rewardAmount: referral.rewardAmount,
                bonusAmount: referral.bonusAmount,
                totalUses: 0,
                maxUses: referral.maxUses,
                expiresAt: referral.expiresAt,
                isActive: true
            }
        });

    } catch (error) {
        console.error('Generate referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating referral code',
            error: error.message
        });
    }
};

// Use referral code
exports.useReferralCode = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const userId = req.user._id;

        if (!referralCode) {
            return res.status(400).json({
                success: false,
                message: 'Referral code is required'
            });
        }

        const { Referral } = require('../models/AdvancedOrders');

        const referral = await Referral.findOne({
            referralCode,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired referral code'
            });
        }

        // Check if user is trying to use their own referral code
        if (referral.referrer.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot use your own referral code'
            });
        }

        // Check if user has already used a referral code
        const existingUse = await Referral.findOne({
            referred: userId,
            status: 'completed'
        });

        if (existingUse) {
            return res.status(400).json({
                success: false,
                message: 'You have already used a referral code'
            });
        }

        // Update referral with referred user
        referral.referred = userId;
        referral.status = 'completed';
        referral.usedAt = new Date();
        await referral.save();

        // Give bonus to new user
        const newUser = await User.findById(userId);
        const oldBalance = newUser.byteBalance;
        newUser.byteBalance += referral.bonusAmount;
        await newUser.save();

        // Give reward to referrer
        const referrer = await User.findById(referral.referrer);
        referrer.byteBalance += referral.rewardAmount;
        await referrer.save();

        // Create notifications
        const newUserNotification = new Notification({
            userId: userId,
            message: `Welcome bonus: ${referral.bonusAmount} bytes added to your account!`
        });
        await newUserNotification.save();

        const referrerNotification = new Notification({
            userId: referral.referrer,
            message: `Your referral was successful! ${referral.rewardAmount} bytes added to your account.`
        });
        await referrerNotification.save();

        // Send email notifications
        setImmediate(async () => {
            try {
                // Email to new user (referred user)
                if (newUser.email) {
                    const newUserEmailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #FFFFFF;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: #990000;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .bonus-info {
      background-color: #FFCC00;
      border-left: 4px solid #990000;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      color: #000000;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #FFFFFF;
      color: #990000;
      font-size: 14px;
    }
    .brand {
      color: #990000;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Welcome Bonus Received! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi ${newUser.username}! 👋</p>
      <p>Congratulations! You've successfully used a referral code and earned a welcome bonus!</p>
      <div class="bonus-info">
        <p><strong>🎁 Welcome Bonus:</strong> ${referral.bonusAmount} bytes</p>
        <p><strong>💳 Your New Balance:</strong> ${newUser.byteBalance} bytes</p>
        <p><strong>👤 Referred by:</strong> ${referrer.username}</p>
      </div>
      <p>Thanks to your friend ${referrer.username} for inviting you to join Byte! Now you have extra bytes to enjoy delicious food on campus! 🍕</p>
      <p>Ready to place your first order? Let's get started! 🚀</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Welcome to the family! 😋</p>
    </div>
  </div>
</body>
</html>
                    `;
                    await sendEmail(newUser.email, 'Welcome Bonus - Referral Success!', 'You have earned a welcome bonus!', newUserEmailHtml);
                }

                // Email to referrer
                if (referrer.email) {
                    const referrerEmailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #FFFFFF;
      color: #000000;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: #990000;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .reward-info {
      background-color: #FFCC00;
      border-left: 4px solid #990000;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
      color: #000000;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #FFFFFF;
      color: #990000;
      font-size: 14px;
    }
    .brand {
      color: #990000;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Referral Reward Earned! 💰</h1>
    </div>
    <div class="content">
      <p>Hi ${referrer.username}! 👋</p>
      <p>Awesome news! Someone just used your referral code and you've earned a reward!</p>
      <div class="reward-info">
        <p><strong>🎁 Referral Reward:</strong> ${referral.rewardAmount} bytes</p>
        <p><strong>💳 Your New Balance:</strong> ${referrer.byteBalance} bytes</p>
        <p><strong>👤 New Member:</strong> ${newUser.username}</p>
        <p><strong>🔗 Referral Code:</strong> ${referralCode}</p>
      </div>
      <p>Thank you for spreading the word about Byte! Your friend ${newUser.username} has joined our platform and earned their welcome bonus too! 🎉</p>
      <p>Keep sharing and earning! Generate more referral codes to invite more friends! 🚀</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Thank you for growing our community! 😋</p>
    </div>
  </div>
</body>
</html>
                    `;
                    await sendEmail(referrer.email, 'Referral Reward Earned!', 'Your referral was successful - reward earned!', referrerEmailHtml);
                }
            } catch (emailError) {
                console.error('Error sending referral emails:', emailError);
            }
        });

        res.status(200).json({
            success: true,
            message: `Referral code applied successfully! You earned ${referral.bonusAmount} bytes.`,
            data: {
                rewardEarned: referral.bonusAmount,
                newBalance: newUser.byteBalance,
                referrerBonus: referral.rewardAmount
            }
        });

    } catch (error) {
        console.error('Use referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Error using referral code',
            error: error.message
        });
    }
};

// Get user delivery information by username (for ordering for others)
exports.getUserDeliveryInfo = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const user = await User.findOne({ username }).select('username phoneNumber location nearestLandmark email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User delivery information retrieved successfully',
      user: {
        username: user.username,
        phoneNumber: user.phoneNumber,
        location: user.location,
        nearestLandmark: user.nearestLandmark,
        hasDeliveryInfo: !!(user.location && user.phoneNumber)
      }
    });
  } catch (error) {
    console.error('Error fetching user delivery info:', error);
    res.status(500).json({ message: 'Error fetching user information' });
  }
};



