require('dotenv').config();
const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');
const sendEmail = require('../configs/nodemailer');
const User = require('../models/User');
const Meal = require('../models/Meals')
const Notification = require('../models/Notifications')
const axios = require('axios');

async function sendSMS(to, message) {
    const data = {
        to: to,
        from: process.env.TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        api_key: process.env.TERMII_API_KEY,
        channel: 'generic',
    };

    const options = {
        method: 'POST',
        url: process.env.TERMII_BASE_URL,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios(options);
        
    } catch (error) {
        console.error('Error sending SMS:', error.message || error);
    }
}

// Helper function to find restaurant by ID with fallback methods
const findRestaurantByIdHelper = async (id) => {
    try {
        // First try customId (case-insensitive)
        let restaurant = await Restaurant.findOne({ 
            customId: { $regex: new RegExp(`^${id}$`, 'i') } 
        });
        
        // If not found and looks like MongoDB ObjectId, try that
        if (!restaurant && id.match(/^[0-9a-fA-F]{24}$/)) {
            restaurant = await Restaurant.findById(id);
        }
        
        // If still not found, try exact case match
        if (!restaurant) {
            restaurant = await Restaurant.findOne({ customId: id });
        }
        
        return restaurant;
    } catch (error) {
        console.error('Error in findRestaurantByIdHelper:', error);
        return null;
    }
};

exports.createOrder = async (request, response) => {
    const TERMII_BASE_URL = process.env.TERMII_BASE_URL;
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID;

    const { user, meals, note, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark, fee, orderForUsername } = request.body;
    try {
        const restaurant = await findRestaurantByIdHelper(restaurantCustomId);
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        if (!restaurant.isActive) {
            return response.status(403).json({ message: 'Restaurant is currently closed' });
        }

        // Handle ordering for another user
        let orderingUser = await User.findById(user);
        let recipientUser = null;
        let finalLocation = location;
        let finalPhoneNumber = phoneNumber;
        let finalNearestLandmark = nearestLandmark;

        if (orderForUsername) {
            // Find the recipient user by username
            recipientUser = await User.findOne({ username: orderForUsername });
            if (!recipientUser) {
                return response.status(404).json({ message: 'Recipient user not found' });
            }

            // Use recipient's saved location and phone if available, otherwise use provided values
            finalLocation = recipientUser.location || location;
            finalPhoneNumber = recipientUser.phoneNumber || phoneNumber;
            finalNearestLandmark = recipientUser.nearestLandmark || nearestLandmark;

            // Validate that we have the required delivery information
            if (!finalLocation || !finalPhoneNumber) {
                return response.status(400).json({ 
                    message: 'Recipient user does not have saved location/phone. Please provide delivery details.',
                    recipientInfo: {
                        hasLocation: !!recipientUser.location,
                        hasPhone: !!recipientUser.phoneNumber,
                        hasLandmark: !!recipientUser.nearestLandmark
                    }
                });
            }
        }
        const mealDetails = await Promise.all(
            meals.map(async ({ mealId, quantity }) => {
                const meal = await Meal.findOne({ customId: mealId });
                if (!meal) {
                    throw new Error(`Meal with customId ${mealId} not found`);
                }
                return { meal: meal._id, quantity }; 
            })
        );

        const newOrder = new Order({
            user,
            meals: mealDetails, 
            note,
            totalPrice,
            location: finalLocation,
            nearestLandmark: finalNearestLandmark,
            phoneNumber: finalPhoneNumber,
            restaurant: restaurant._id, 
            fee,
            // Store recipient information if ordering for someone else
            ...(orderForUsername && {
                recipient: {
                    name: recipientUser.username,
                    phone: recipientUser.phoneNumber,
                    instructions: `Order for ${recipientUser.username}`
                }
            })
        });

        await newOrder.save();

        const userDoc = await User.findById(user);
        if (!userDoc) {
            return response.status(404).json({ message: 'User not found' });
        }

        // Create notification for the ordering user
        const orderingUserMessage = orderForUsername 
            ? `You placed an order for ${recipientUser.username}! Order ID: ${newOrder.customId}. They'll receive their delicious meal soon!`
            : `You must be hungry, you placed a new order! It has an ID of ${newOrder.customId}. Watch out for it!`;

        const userNotification = new Notification({
          userId: userDoc._id,
          message: orderingUserMessage,
        });
        await userNotification.save();
        
        userDoc.notifications.push(userNotification._id);
        userDoc.orderHistory.push(newOrder._id);
        await userDoc.save();

        // If ordering for someone else, notify the recipient too
        if (orderForUsername && recipientUser) {
            const recipientNotification = new Notification({
                userId: recipientUser._id,
                message: `${userDoc.username} ordered food for you! Order ID: ${newOrder.customId}. Get ready for a delicious surprise!`,
            });
            await recipientNotification.save();
            
            recipientUser.notifications.push(recipientNotification._id);
            await recipientUser.save();

            // Send email to recipient if they have an email
            if (recipientUser.email) {
                const recipientEmailHtml = `
                <html>
                <head>
                  <style>
                    body {
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                      background-color: #f8f9fa;
                      color: #000000;
                      margin: 0;
                      padding: 0;
                    }
                    .container {
                      width: 90%;
                      max-width: 600px;
                      margin: 30px auto;
                      padding: 0;
                      border-radius: 12px;
                      background-color: #ffffff;
                      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                      overflow: hidden;
                    }
                    .header {
                      text-align: center;
                      padding: 40px 20px 30px;
                      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                      color: #ffffff;
                    }
                    .header h1 {
                      margin: 0;
                      font-size: 28px;
                      font-weight: 700;
                      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    }
                    .brand-text {
                      color: #FFCC00;
                      font-weight: 800;
                    }
                    .content {
                      font-size: 16px;
                      line-height: 1.6;
                      padding: 30px;
                      color: #333333;
                    }
                    .surprise-box {
                      background: linear-gradient(135deg, #FFCC00 0%, #ffdb4d 100%);
                      color: #000000;
                      text-align: center;
                      padding: 20px;
                      margin: 20px 0;
                      border-radius: 8px;
                      font-weight: bold;
                      font-size: 18px;
                    }
                    .order-details {
                      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                      border-left: 4px solid #28a745;
                      padding: 20px;
                      border-radius: 8px;
                      margin: 20px 0;
                    }
                    .footer {
                      background-color: #000000;
                      color: #ffffff;
                      text-align: center;
                      padding: 20px;
                      font-size: 14px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🎁 Someone Ordered For You!</h1>
                    </div>
                    <div class="content">
                      <div class="surprise-box">
                        🎉 ${userDoc.username} just treated you to a meal! 🎉
                      </div>
                      <p>What a thoughtful friend! ${userDoc.username} has ordered delicious food for you through <span class="brand-text">Byte</span>!</p>
                      
                      <div class="order-details">
                        <p><strong>📦 Order ID:</strong> ${newOrder.customId}</p>
                        <p><strong>👤 Ordered by:</strong> ${userDoc.username}</p>
                        <p><strong>📍 Delivery to:</strong> ${finalLocation}</p>
                        <p><strong>📱 Contact:</strong> ${finalPhoneNumber}</p>
                        <p><strong>🏘️ Landmark:</strong> ${finalNearestLandmark || 'Not specified'}</p>
                      </div>

                      <p>Your meal is being prepared and will be delivered to you soon. Make sure to be available at the delivery location!</p>
                      <p>Don't forget to thank ${userDoc.username} for this awesome treat! 😊</p>
                    </div>
                    <div class="footer">
                      <p>© ${new Date().getFullYear()} Byte - Bringing friends together through food! 🍕</p>
                    </div>
                  </div>
                </body>
                </html>
                `;

                await sendEmail(
                    recipientUser.email,
                    'Someone Ordered Food For You!',
                    `${userDoc.username} has ordered food for you through Byte!`,
                    recipientEmailHtml
                );
            }
        }
        const restaurantNotification = new Notification({
          restaurantId: restaurant._id,
          message: `You have received a new order with ID: ${newOrder.customId}.`,
      });

        const smsMessage = `You have received a new order with ID: ${newOrder.customId}. Please check your dashboard for details.`;
        function formatPhoneNumber(number) {
    const strNumber = String(number);
    if (strNumber.startsWith("234")) {
        return strNumber;
    }
    if (strNumber.startsWith("0")) {
        return "234" + strNumber.slice(1);
    }
    if (/^[789]/.test(strNumber)) {
        return "234" + strNumber;
    }
    return strNumber;
}

const formattedNumber = formatPhoneNumber(restaurant.contactNumber);
sendSMS(formattedNumber, smsMessage);
      await restaurantNotification.save();
      restaurant.notifications.push(restaurantNotification._id);
      await restaurant.save();
        const emailHtml = `
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f8f9fa;
              color: #000000;
              margin: 0;
              padding: 0;
            }
            .container {
              width: 90%;
              max-width: 600px;
              margin: 30px auto;
              padding: 0;
              border-radius: 12px;
              background-color: #ffffff;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              text-align: center;
              padding: 40px 20px 30px;
              background: linear-gradient(135deg, #990000 0%, #cc0000 100%);
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .brand-text {
              color: #FFCC00;
              font-weight: 800;
            }
            .content {
              font-size: 16px;
              line-height: 1.6;
              padding: 30px;
              color: #333333;
            }
            .content p {
              margin: 15px 0;
            }
            .order-details {
              background: linear-gradient(135deg, #fff3cd 0%, #fffaee 100%);
              border-left: 4px solid #FFCC00;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .order-details p {
              color: #000000;
              font-weight: 600;
              margin: 8px 0;
            }
            .alert-box {
              background-color: #d1ecf1;
              border-left: 4px solid #17a2b8;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background-color: #000000;
              color: #ffffff;
              text-align: center;
              padding: 20px;
              font-size: 14px;
            }
            .footer .brand {
              color: #FFCC00;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ New <span class="brand-text">Byte</span> Order!</h1>
            </div>
            <div class="content">
              <p>Exciting news! 🎉 You have received a new order from a hungry customer!</p>
              ${orderForUsername ? `<p><strong>🎁 Special Order:</strong> This order was placed by ${userDoc.username} for ${recipientUser.username}</p>` : ''}
              
              <div class="order-details">
                <p>📍 <strong>Delivery Location:</strong> ${finalLocation}</p>
                <p>🏘️ <strong>Nearest Landmark:</strong> ${finalNearestLandmark || 'Not specified'}</p>
                <p>📱 <strong>Contact Phone:</strong> ${finalPhoneNumber}</p>
                <p>📝 <strong>Special Instructions:</strong> ${note || 'No special notes'}</p>
                ${orderForUsername ? `<p>👤 <strong>Recipient:</strong> ${recipientUser.username}</p>` : ''}
                ${orderForUsername ? `<p>🛒 <strong>Ordered by:</strong> ${userDoc.username}</p>` : ''}
              </div>

              <div class="alert-box">
                <p><strong>📋 Next Steps:</strong></p>
                <ul>
                  <li>Check your restaurant dashboard for full meal details</li>
                  <li>Prepare the order with care</li>
                  <li>Contact the ${orderForUsername ? 'recipient' : 'customer'} if needed</li>
                  <li>Update order status as you progress</li>
                </ul>
              </div>

              <p>Let's make this ${orderForUsername ? 'surprise delivery' : 'customer\'s day'} delicious! 🚀</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Partner</p>
              <p>Cooking up happiness, one order at a time! 👨‍🍳</p>
            </div>
          </div>
        </body>
        </html>
        `;

        await sendEmail(
            restaurant.email,
            'New Order Received',
            `You have received a new order. Please check the dashboard for details.`,
            emailHtml
        );

        const successMessage = orderForUsername 
            ? `Order created successfully for ${recipientUser.username}! Both you and ${recipientUser.username} have been notified.`
            : 'Order created successfully, and notification sent to the restaurant!';

        return response.status(201).json({
            message: successMessage,
            order: newOrder,
            recipientInfo: orderForUsername ? {
                username: recipientUser.username,
                deliveryLocation: finalLocation,
                deliveryPhone: finalPhoneNumber,
                landmark: finalNearestLandmark
            } : null
        });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


exports.getOrdersByRestaurant = async (request, response) => {
    const { customId } = request.params;

    try {
        const restaurant = await findRestaurantByIdHelper(customId);
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        const orders = await Order.find({ restaurant: restaurant._id })
        .populate('user')
        .populate('meals.meal');
      
        // if (!orders.length) {
        //     return response.status(404).json({ message: 'No orders found for this restaurant' });
        // }

        response.json(orders);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.getOrderById = async (request, response) => {
    const { orderId } = request.params;

    try {
        const order = await Order.findById(orderId).populate('user meals.meal');
        if (!order) {
            return response.status(404).json({ message: 'Order not found' });
        }

        response.json(order);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.orderConfirmation = async (request, response) => {
  const { orderId } = request.params;
  const { additionalFee, requestDescription } = request.body;

  try {
    const order = await Order.findOne({ customId: orderId }).populate('user meals.meal restaurant');

    if (!order) {
      return response.status(404).json({ message: 'Order not found' });
    }

    const restaurant = await Restaurant.findById(order.restaurant);
    if (!restaurant) {
      return response.status(404).json({ message: 'Restaurant not found' });
    }

    if (requestDescription) {
      order.requestDescription = requestDescription;
    }

    if (additionalFee) {
      const parsedFee = parseFloat(additionalFee);
      
      // Ensure fee and totalPrice are numbers to avoid undefined calculations
      const currentFee = order.fee || 600; // default fee
      const currentTotalPrice = order.totalPrice || 0;
      
      // Store the food amount separately if not already set
      if (!order.foodAmount) {
        order.foodAmount = currentTotalPrice - currentFee;
      }

      // Calculate new total price by replacing the old fee with the new fee
      order.totalPrice = order.foodAmount + parsedFee;
      
      if (parsedFee <= currentFee) {
        order.status = 'Confirmed';
        order.fee = parsedFee;
      } else {
        // Fee exceeds permitted limit - require user approval
        order.status = 'Fee Requested';
        order.fee = parsedFee;

        const user = await User.findById(order.user._id);
        if (user && user.email) {
          const emailHtml = `
          <html>
          <head>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                color: #333333;
                margin: 0;
                padding: 0;
              }
              .email-container {
                width: 90%;
                max-width: 600px;
                margin: 30px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                text-align: center;
                padding: 40px 20px 30px;
                background: linear-gradient(135deg, #990000 0%, #cc0000 100%);
                color: #ffffff;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
              }
              .brand-text {
                color: #FFCC00;
                font-weight: 800;
              }
              .content {
                padding: 30px;
              }
              .content p {
                color: #333333;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;
              }
              .fee-info {
                background: linear-gradient(135deg, #fff3cd 0%, #fffaee 100%);
                border-left: 4px solid #FFCC00;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .fee-info p {
                color: #000000;
                font-weight: 600;
                margin: 8px 0;
              }
              .highlight {
                background: linear-gradient(135deg, #FFCC00 0%, #ffdb4d 100%);
                color: #000000;
                font-weight: 800;
                padding: 4px 8px;
                border-radius: 4px;
              }
              .alert-box {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                background-color: #000000;
                color: #ffffff;
                text-align: center;
                padding: 20px;
                font-size: 14px;
              }
              .footer .brand {
                color: #FFCC00;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>⚠️ <span class="brand-text">Byte</span> Order Alert</h1>
              </div>
              <div class="content">
                <p>Hi there! 👋</p>
                <p>We need your attention for order <strong>#${order.customId}</strong>. The restaurant has requested an additional fee that exceeds the standard limit.</p>
              
                <div class="fee-info">
                  <p>💰 <strong>Additional Fee Requested:</strong> <span class="highlight">₦${parsedFee}</span></p>
                  <p>📊 <strong>Standard Permitted Fee:</strong> ₦${order.fee}</p>
                  <p>📝 <strong>Restaurant Note:</strong> ${requestDescription || "No description provided"}</p>
                </div>

                <div class="alert-box">
                  <p><strong>🚨 Action Required:</strong></p>
                  <p>Please log into your Byte account and check your order history to either approve or cancel this order.</p>
                </div>

                <p><strong>What you can do:</strong></p>
                <ul>
                  <li>✅ Approve the additional fee if you're okay with it</li>
                  <li>❌ Cancel the order if the fee seems unreasonable</li>
                  <li>📞 Contact our support team if you have questions</li>
                </ul>

                <p>We're here to help if you need assistance! 🤝</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
                <p>Keeping your orders transparent! 🔍</p>
              </div>
            </div>
          </body>
          </html>
          `;
          await sendEmail(user.email, 'Order Additional Fee Request', 'Your order has a fee request that requires approval.', emailHtml); 
        }
        await order.save();
        const userNotification = new Notification({
          userId: user._id,
          message: `For order ${order.customId}, requested fee is higher than permitted fee, check your order history! .`,
        });
        await userNotification.save();
        
        user.notifications.push(userNotification._id);
        await user.save();
  
        return res.status(200).json({ 
          success: true,
          message: 'Fee request sent to user for approval',
          order: order
        });
      }
    } else {
      // No additional fee or fee is within permitted limit
      order.status = 'Confirmed';
      
      // Ensure fee is set to default if not already set
      if (!order.fee) {
        order.fee = 600; // default fee
      }
      
      // Store the food amount separately if not already set
      if (!order.foodAmount && order.totalPrice) {
        order.foodAmount = order.totalPrice - order.fee;
      }
    }

    // Only proceed with confirmation logic if status is 'Confirmed'
    if (order.status !== 'Confirmed') {
      return; // Early return if not confirmed (fee request sent)
    }

    const user = await User.findById(order.user._id);
    if (!user) {
      return response.status(404).json({ message: 'User not found' });
    }

    if (user.byteBalance < order.totalPrice) {
      order.status = 'Canceled';
      await order.save();

      const userNotification = new Notification({
        userId: user._id,
        message: `Order ${order.customId} has been cancelled due to insufficient balance.`,
      });
      await userNotification.save();
      
      user.notifications.push(userNotification._id);
      await user.save();

      const emailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .brand-text {
      color: #FFCC00;
      font-weight: 800;
    }
    .content {
      padding: 30px;
    }
    .content p {
      color: #333333;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
      border-left: 4px solid #dc3545;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .order-info p {
      color: #000000;
      font-weight: 600;
      margin: 8px 0;
    }
    .balance-warning {
      background-color: #fff3cd;
      border-left: 4px solid #FFCC00;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .action-button {
      background: linear-gradient(135deg, #FFCC00 0%, #ffdb4d 100%);
      color: #000000;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      display: inline-block;
      margin: 15px 0;
      text-align: center;
    }
    .footer {
      background-color: #000000;
      color: #ffffff;
      text-align: center;
      padding: 20px;
      font-size: 14px;
    }
    .footer .brand {
      color: #FFCC00;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>😔 <span class="brand-text">Byte</span> Order Update</h1>
    </div>
    <div class="content">
      <p>Hi there! 👋</p>
      <p>We're sorry to inform you that your order has been cancelled due to insufficient balance in your Byte wallet.</p>
      
      <div class="order-info">
        <p>📦 <strong>Order ID:</strong> #${order.customId}</p>
        <p>📊 <strong>Status:</strong> ${order.status}</p>
        <p>💰 <strong>Total Amount:</strong> ₦${(order.totalPrice).toFixed(2)}</p>
        <p>📝 <strong>Note:</strong> ${requestDescription || "No description provided"}</p>
      </div>

      <div class="balance-warning">
        <p><strong>💳 What happened?</strong></p>
        <p>Your Byte balance wasn't sufficient to cover the total order amount including any additional fees.</p>
      </div>

      <p><strong>🚀 What's next?</strong></p>
      <ul>
        <li>💰 Top up your Byte balance</li>
        <li>🛒 Place your order again</li>
        <li>🍽️ Enjoy your delicious meal!</li>
      </ul>

      <p>Don't let hunger wait - top up now and get back to enjoying great food! 😋</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>We'll be here when you're ready to bite again! 🍕</p>
    </div>
  </div>
</body>
</html>
      `;
      await sendEmail(user.email, 'Order Cancelled', 'Your order has been cancelled due to insufficient balance.', emailHtml);

      return response.status(400).json({ message: 'Insufficient balance. Order has been cancelled.' });
    }

    order.status = 'Confirmed';
    restaurant.walletBalance += Number(order.totalPrice);

    const restaurantNotification = new Notification({
      restaurantId: restaurant._id,
      message: `Order ${order.customId} has been confirmed, ₦${order.totalPrice} has been added to your wallet,  and order should be delivered soon.`,
    });
    await restaurantNotification.save();
    restaurant.notifications.push(restaurantNotification._id);
    await restaurant.save();

    const userNotification = new Notification({
      userId: order.user._id,
      message: `Your order ${order.customId} has been confirmed and ₦${(order.totalPrice).toFixed(2)} has been deducted from your balance!`,
    });
    await userNotification.save();
    
    user.byteBalance -= order.totalPrice;
    user.notifications.push(userNotification._id);
    await user.save();

    if (user && user.email) {
      const emailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .brand-text {
      color: #FFCC00;
      font-weight: 800;
    }
    .content {
      padding: 30px;
    }
    .content p {
      color: #333333;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
      border-left: 4px solid #28a745;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .order-info p {
      color: #000000;
      font-weight: 600;
      margin: 8px 0;
    }
    .success-box {
      background: linear-gradient(135deg, #FFCC00 0%, #ffdb4d 100%);
      color: #000000;
      text-align: center;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
    }
    .timeline {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .timeline h3 {
      color: #990000;
      margin-top: 0;
    }
    .footer {
      background-color: #000000;
      color: #ffffff;
      text-align: center;
      padding: 20px;
      font-size: 14px;
    }
    .footer .brand {
      color: #FFCC00;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎉 <span class="brand-text">Byte</span> Order Confirmed!</h1>
    </div>
    <div class="content">
      <p>Great news! 🎊</p>
      <p>Your order has been successfully confirmed and your delicious meal is on its way!</p>
      
      <div class="success-box">
        ✨ Order Confirmed & Payment Processed ✨
      </div>

      <div class="order-info">
        <p>📦 <strong>Order ID:</strong> #${order.customId}</p>
        <p>📊 <strong>Status:</strong> ${order.status}</p>
        <p>💰 <strong>Total Paid:</strong> ₦${(order.totalPrice).toFixed(2)}</p>
        <p>📝 <strong>Special Note:</strong> ${requestDescription || "No special instructions"}</p>
      </div>

      <div class="timeline">
        <h3>🚀 What happens next?</h3>
        <ul>
          <li>👨‍🍳 Restaurant is preparing your order</li>
          <li>📦 Order will be packaged with care</li>
          <li>🛵 Delivery will begin shortly</li>
          <li>🍽️ Enjoy your delicious meal!</li>
        </ul>
      </div>

      <p>If you have any questions or concerns, our support team is always ready to help! 🤝</p>
      <p>Thank you for choosing Byte - we hope you enjoy every bite! 😋</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Making campus dining delightful! 🍕</p>
    </div>
  </div>
</body>
</html>
      `;
      await sendEmail(user.email, 'Order Confirmed', 'Your order status has been updated.', emailHtml);
    }

    await order.save();

    return response.status(200).json({ message: 'Order updated successfully!', order });

  } catch (error) {
    console.error('Error in order confirmation:', error);
    return response.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.markOrderAsDelivered = async (request, response) => {
  const { orderId } = request.params;

  try {
    const order = await Order.findOne({ customId: orderId }).populate('user restaurant');

    if (!order) {
      return response.status(404).json({ message: 'Order not found' });
    }


    order.status = 'Delivered';
    await order.save();

    const userNotification = new Notification({
      userId: order.user._id,
      message: `Your order ${order.customId} is out for delivery!`,
    });
    await userNotification.save();
    
    const user = await User.findById(order.user._id);
    if (user && user.email) {
      const emailHtml = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 95%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .order-info p {
      color: #333333;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>Order Almost At Your Door!</h1>
    <p>Your order with ID <strong>${order.customId}</strong> has been sent out for delivery!</p>
    
    <div class="order-info">
      <p>Order ID: ${order.customId}</p>
      <p>Status: Out for delivery! </p>
      <p>Total Price: ₦${(order.totalPrice).toFixed(2)}</p>
    </div>

    <p>Thank you for using our service. If you have any questions or need assistance, feel free to contact us.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;
      await sendEmail(user.email, 'Knock, Knock!', 'Your order has been sent out for delivery!.', emailHtml);
    }

    const restaurantNotification = new Notification({
      restaurantId: order.restaurant._id,
      message: `Order ${order.customId} has been delivered.`,
    });
    await restaurantNotification.save();
    
    const restaurant = await Restaurant.findById(order.restaurant._id);
    restaurant.notifications.push(restaurantNotification._id);
    await restaurant.save();

    return response.status(200).json({ message: 'Order marked as delivered successfully!', order });
    
  } catch (error) {
    console.error('Error marking order as delivered:', error);
    return response.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.handleOrderStatus = async (request, response) => {
  try {
    const { orderId } = request.params;
    const { action } = request.body; 

    const order = await Order.findOne({ customId: orderId }).populate('restaurant').populate('user');
    if (!order) return response.status(404).json({ message: 'Order not found' });

    const user = await User.findById(order.user._id);
    const restaurant = await Restaurant.findById(order.restaurant._id);

    if (action === 'accept') {
      if (order.status !== 'Fee Requested') {
        return response.status(400).json({ message: 'Order cannot be accepted at this stage' });
      }

      if (user.byteBalance < (order.totalPrice)) {
        order.status = 'Canceled';
        await order.save();

        const userNotification = new Notification({
          userId: user._id,
          message: `Order ${order.customId} has been cancelled due to insufficient balance.`,
        });
        await userNotification.save();

        const restaurantNotification = new Notification({
          restaurantId: restaurant._id,
          message: `Order ${order.customId} has been cancelled due to user's insufficient balance.`,
        });
        await restaurantNotification.save();

        return response.status(400).json({ message: 'Insufficient balance, order has been canceled, sorry...' });
      }

      user.byteBalance -= order.totalPrice;
      await user.save();

      restaurant.walletBalance += Number(order.totalPrice);
      await restaurant.save();

      order.status = 'Confirmed';
      await order.save();

      const userNotification = new Notification({
        userId: user._id,
        message: `Your order ${order.customId} has been confirmed!`,
      });
      await userNotification.save();


      const restaurantNotification = new Notification({
        restaurantId: restaurant._id,
        message: `Order ${order.customId} has been confirmed, , ₦${order.totalPrice} has been added to your wallet!`,
      });
      await restaurantNotification.save();

      if (user.email) {
        const emailHtml = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 95%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .order-info p {
      color: #333333;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>Order Confirmed!</h1>
    <p>Order with ID <strong>${order.customId}</strong> has just  been confirmed!</p>
    
    <div class="order-info">
      <p>Order ID: ${order.customId}</p>
      <p>Status: Confirmed</p>
      <p>Total Price: ₦${(order.totalPrice).toFixed(2)}</p>
    </div>

    <p>Thank you for using our service. If you have any questions or need assistance, feel free to contact us.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;
        await sendEmail(user.email, 'Order Confirmation', 'Your order has been confirmed!', emailHtml);
        await sendEmail(restaurant.email, 'Order Confirmation after fee review', 'Order has been confirmed, wallet has been credited! Check dashboard and deliver...', emailHtml);
      }

    } else if (action === 'cancel') {
      if (order.status !== 'Fee Requested') {
        return response.status(400).json({ message: 'Order cannot be canceled at this stage' });
      }

      order.status = 'Canceled';
      await order.save();


      const userNotification = new Notification({
        userId: user._id,
        message: `Your order ${order.customId} has been canceled.`,
      });
      await userNotification.save();

      const restaurantNotification = new Notification({
        restaurantId: restaurant._id,
        message: `Order ${order.customId} has been canceled.`,
      });
      await restaurantNotification.save();

      if (user.email) {
        const emailHtml = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 95%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .order-info p {
      color: #333333;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>Order Canceled</h1>
    <p>Order with ID <strong>${order.customId}</strong> has been canceled.</p>
    
    <div class="order-info">
      <p>Order ID: ${order.customId}</p>
      <p>Status: Canceled</p>
      <p>Total Price: ₦${(order.totalPrice).toFixed(2)}</p>
    </div>

    <p>We apologize for the inconvenience. If you have any questions or need assistance, feel free to contact us.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;
        await sendEmail(user.email, 'Order Canceled', 'Your order has been canceled', emailHtml);
        await sendEmail(restaurant.email, 'Order Canceled', 'Order has been canceled', emailHtml);

      }
    }

    return response.status(200).json({ message: `Order ${action}ed successfully`, order });
  } catch (error) {
    console.error('Error handling order:', error);
    return response.status(500).json({ message: 'Internal server error' });
  }
};

exports.createWithdrawal = async (req, res) => {
    const { restaurantName, amount } = req.body;

    try {
        const restaurant = await Restaurant.findOne({ name: restaurantName });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const withdrawal = new Withdrawal({
            restaurantName,
            amount,
        });
        await withdrawal.save();

        const restaurantNotification = new Notification({
            restaurantId: restaurant._id,
            message: `A withdrawal request of ₦${amount.toFixed(2)} has been created. Your wallet balance has been updated.`,
        });
        await restaurantNotification.save();
        restaurant.notifications.push(restaurantNotification._id);
        await restaurant.save();

        restaurant.walletBalance -= Number(amount);
        await restaurant.save();

        const emailHtml = `
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 95%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .order-info p {
      color: #333333;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>Withdrawal Request Received</h1>
    <p>Your withdrawal request has been successfully processed!</p>
    
    <div class="order-info">
      <p>Restaurant Name: ${restaurantName}</p>
      <p>Withdrawal Amount: ₦${amount.toFixed(2)}</p>
      <p>Updated Wallet Balance: ₦${restaurant.walletBalance.toFixed(2)}</p>
    </div>

    <p>If you have any questions or concerns, please contact our support team.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;
        
        await sendEmail(restaurant.email, 'Withdrawal Request Received', 'Your withdrawal request has been processed.', emailHtml);

        res.status(201).json({ message: 'Withdrawal created successfully!', withdrawal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

