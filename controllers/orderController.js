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

    const { meals, note, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark, fee, orderForUsername } = request.body;
    
    // Get user from authentication middleware instead of request body
    const userId = request.user._id;
    
    try {
        const restaurant = await findRestaurantByIdHelper(restaurantCustomId);
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        if (!restaurant.isActive) {
            return response.status(403).json({ message: 'Restaurant is currently closed' });
        }

        // Handle ordering for another user
        let orderingUser = await User.findById(userId);
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
            user: userId,
            meals: mealDetails, 
            note,
            totalPrice,
            foodAmount: totalPrice - (fee || 0), // Store the food amount separately
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

        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return response.status(404).json({ message: 'User not found' });
        }

        // Check if user has sufficient balance before creating the order
        if (userDoc.byteBalance < totalPrice) {
            return response.status(400).json({ 
                message: 'Insufficient balance. Please top up your Byte wallet before placing an order.',
                currentBalance: userDoc.byteBalance,
                requiredAmount: totalPrice
            });
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
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
                    .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
                    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                    .brand-text, .brand { color: #E6B805; font-weight: bold; }
                    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
                    .content p { margin: 15px 0; }
                    .order-details, .order-info, .fee-info, .wallet-update, .success-box, .delivery-banner, .balance-warning, .next-steps, .surprise-box { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
                    .alert-box { background-color: #990000; color: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
                    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="email-container">
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

        // Calculate food amount (total minus fee) for SMS display
        const foodAmountForSMS = totalPrice - (fee || 0);
        const smsMessage = `New order #${newOrder.customId}! Items: ${meals.length}, Meal cost: ₦${foodAmountForSMS}. ${note ? 'Note: ' + note.substring(0, 30) + (note.length > 30 ? '...' : '') : ''} Delivery: ${finalLocation.substring(0, 20)}${finalLocation.length > 20 ? '...' : ''}. Check dashboard now.`;
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
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
            .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .brand-text, .brand { color: #E6B805; font-weight: bold; }
            .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
            .content p { margin: 15px 0; }
            .order-details, .order-info, .fee-info, .wallet-update, .success-box, .delivery-banner, .balance-warning, .next-steps, .surprise-box { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .alert-box { background-color: #990000; color: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="email-container">
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
        .populate('meals.meal')
        .populate('restaurant', 'customId name location imageUrl');
      
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
        // Try to find order by customId first
        let order = await Order.findOne({ customId: orderId }).populate('user meals.meal');
        
        // If not found and orderId is a valid MongoDB ObjectId, try finding by _id
        if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
            order = await Order.findById(orderId).populate('user meals.meal');
        }

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
  
  // Detailed logging of the incoming request
  console.log('REQUEST BODY:', request.body);
  console.log('REQUEST HEADERS:', request.headers);
  console.log('REQUEST CONTENT-TYPE:', request.headers['content-type']);
  
  // Extract values from request body or default to null
  const additionalFee = request.body?.additionalFee || null;
  const requestDescription = request.body?.requestDescription || null;
  
  console.log(`Processing confirmation for order ${orderId}`);
  console.log(`Additional Fee: ${additionalFee}, Description: ${requestDescription}`);

  try {
    const order = await Order.findOne({ customId: orderId }).populate('user meals.meal').populate('restaurant', 'name location imageUrl university');

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
      // Convert to number and ensure it's a valid value
      const parsedFee = parseFloat(additionalFee);
      if (isNaN(parsedFee)) {
        console.log(`[Fee Error] Invalid additional fee value: ${additionalFee}`);
        return response.status(400).json({ message: 'Invalid additional fee value' });
      }
      
      console.log(`[Fee Processing] Order ${order.customId}: Requested fee: ${parsedFee}, Original fee: ${order.fee || 0}`);
      
      // Ensure fee and totalPrice are numbers to avoid undefined calculations
      const currentFee = order.fee || 0; // use 0 as default fee
      const currentTotalPrice = order.totalPrice || 0;
      console.log(`[Fee Processing] Current total price: ${currentTotalPrice}, Current fee: ${currentFee}`);
      
      // Store the food amount separately if not already set
      if (!order.foodAmount) {
        order.foodAmount = currentTotalPrice - currentFee;
        console.log(`[Fee Processing] Calculated food amount: ${order.foodAmount}`);
      }

      // Calculate new total price by replacing the old fee with the new fee
      order.totalPrice = order.foodAmount + parsedFee;
      console.log(`[Fee Processing] New total price with requested fee: ${order.totalPrice}`);
      
      console.log(`[Fee Comparison] Comparing fees - Requested: ${parsedFee}, Current: ${currentFee}`);
      
      if (parsedFee <= currentFee) {
        console.log(`[Fee Approved] Fee ${parsedFee} is within limit of ${currentFee}`);
        order.status = 'Confirmed';
        // Keep original fee, update total price with new fee amount
        order.totalPrice = order.foodAmount + parsedFee;
        order.fee = parsedFee; // Update fee since it's within limit
      } else {
        console.log(`[Fee Requires Approval] Fee ${parsedFee} exceeds limit of ${currentFee}`);
        // Fee exceeds permitted limit - require user approval
        console.log(`[Fee Request] Setting order ${order.customId} status to Fee Requested`);
        order.status = 'Fee Requested';
        // DON'T change order.fee - keep user's original fee
        order.requestedFee = parsedFee; // Store the requested fee explicitly
        // Update total price with requested fee for user to see what they'd pay
        order.totalPrice = order.foodAmount + parsedFee;
        await order.save();
        console.log(`[Fee Request] Order saved with Fee Requested status.`);
        
        const user = await User.findById(order.user._id);
        if (!user) {
          return response.status(404).json({ message: 'User not found' });
        }
        
        // Create notification for user
        const feeRequestNotification = new Notification({
          userId: user._id,
          message: `For order ${order.customId}, the restaurant has requested a delivery fee of ₦${parsedFee}. Please check your order history to approve or cancel.`,
        });
        await feeRequestNotification.save();
        
        await user.save();
  
        // Send email to user about fee request
        if (user && user.email) {
          const emailHtml = `
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
              .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
              .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
              .brand-text, .brand { color: #E6B805; font-weight: bold; }
              .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
              .content p { margin: 15px 0; }
              .fee-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
              .fee-info p { color: #000; font-weight: 600; margin: 8px 0; }
              .highlight { background-color: #E6B805; color: #000; font-weight: 800; padding: 4px 8px; border-radius: 4px; }
              .alert-box { background-color: #990000; color: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
              .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
              .footer .brand { color: #E6B805; font-weight: bold; }
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
                  <p>📊 <strong>Standard Permitted Fee:</strong> ₦${currentFee}</p>
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
          console.log(`[Fee Request] Email sent to user ${user.email} about fee request for order ${order.customId}`);
        }
        
        const userNotification = new Notification({
          userId: user._id,
          message: `For order ${order.customId}, requested fee is higher than permitted fee, check your order history! .`,
        });
        await userNotification.save();
        
        user.notifications.push(userNotification._id);
        await user.save();
  
        return response.status(200).json({ 
          success: true,
          message: 'Fee request sent to user for approval',
          order: order
        });
      }
    } else {
      console.log(`[No Additional Fee] Processing order ${order.customId} with no additional fee`);
      
      // Set fee to 0 if not already set
      if (!order.fee) {
        console.log(`[Fee Setting] Setting fee to 0 for order ${order.customId}`);
        order.fee = 0;
      }
      console.log(`[Fee Status] Final fee for order ${order.customId}: ${order.fee}`);
      
      // Store the food amount separately if not already set
      if (!order.foodAmount && order.totalPrice) {
        order.foodAmount = order.totalPrice - order.fee;
      }
      
      // Set status to Confirmed here since there's no fee change requiring approval
      // We'll still check balance below in the common confirmation flow
      order.status = 'Confirmed';
      console.log(`[Status Update] Setting order ${order.customId} status to Confirmed`);
    }      // Only proceed with confirmation logic if status is 'Confirmed'
    console.log(`[Status Check] Order ${order.customId} status: ${order.status}`);
    if (order.status !== 'Confirmed') {
      console.log(`[Non-Confirmed Status] Order requires additional processing. Status: ${order.status}`);
      // If status is 'Fee Requested', return appropriate response
      if (order.status === 'Fee Requested') {
        console.log(`[Fee Request Flow] Initiating fee request process for order ${order.customId}`);
        // Notify restaurant about the fee request status
        const restaurantFeeRequestNotification = new Notification({
          restaurantId: restaurant._id,
          message: `For order ${order.customId}, your additional fee request of ₦${order.fee} has been sent to the customer for approval.`,
        });
        await restaurantFeeRequestNotification.save();
        restaurant.notifications.push(restaurantFeeRequestNotification._id);
        await restaurant.save();
        
        await order.save();
        
        return response.status(200).json({ 
          message: 'Fee request sent to user for approval',
          order: order
        });
      }
    }

    // If we reach here, we should explicitly set the order to Confirmed if not already
    // This covers the case with no additional fee
    if (order.status !== 'Confirmed') {
      order.status = 'Confirmed';
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .order-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .order-info p { color: #000; font-weight: 600; margin: 8px 0; }
    .balance-warning { background-color: #E6B805; color: #000; border-radius: 8px; padding: 15px; margin: 20px 0; font-weight: bold; }
    .action-button { background-color: #E6B805; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; margin: 15px 0; text-align: center; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    .footer .brand { color: #E6B805; font-weight: bold; }
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .order-info { background-color: #d4edda; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .order-info p { color: #000; font-weight: 600; margin: 8px 0; }
    .success-box { background-color: #E6B805; color: #000; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; font-size: 18px; }
    .timeline { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .timeline h3 { color: #990000; margin-top: 0; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    .footer .brand { color: #E6B805; font-weight: bold; }
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

    // After order is confirmed and before returning response in orderConfirmation:
    if (order.status === 'Confirmed' && order.recipient && !order.orderForUsername && order.recipient.phone) {
        const recipientSMS = `Hi ${order.recipient.name}, your Byte food delivery is confirmed! Order ID: ${order.customId}. Delivery to: ${order.location}. Contact: ${order.phoneNumber}. Enjoy your meal!`;
        const formattedRecipientNumber = formatPhoneNumber(order.recipient.phone);
        sendSMS(formattedRecipientNumber, recipientSMS);
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
    const order = await Order.findOne({ customId: orderId }).populate('user').populate('restaurant', 'name location imageUrl');

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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .delivery-banner { background-color: #E6B805; color: #000; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; font-size: 18px; }
    .order-info { background-color: #fff3cd; color: #000; border-left: 4px solid #E6B805; padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .order-info p { color: #000; margin: 8px 0; }
    .delivery-tips { background-color: #d1ecf1; color: #000; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px; font-weight: 600; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    .footer .brand { color: #E6B805; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🛵 <span class="brand-text">Byte</span> Delivery Update</h1>
    </div>
    <div class="content">
      <p>Great news! 🎊</p>
      <p>Your delicious meal is on its way to you right now!</p>
      
      <div class="delivery-banner">
        🚚 Your Order Is Out For Delivery! 🚚
      </div>

      <div class="order-info">
        <p>📦 <strong>Order ID:</strong> #${order.customId}</p>
        <p>📊 <strong>Status:</strong> Out for delivery</p>
        <p>💰 <strong>Total:</strong> ₦${(order.totalPrice).toFixed(2)}</p>
        <p>📍 <strong>Delivery Location:</strong> ${order.location}</p>
        <p>🏘️ <strong>Landmark:</strong> ${order.nearestLandmark || 'Not specified'}</p>
      </div>

      <div class="delivery-tips">
        <p><strong>🚀 Delivery Tips:</strong></p>
        <ul>
          <li>Keep your phone nearby for delivery updates</li>
          <li>Ensure your location is accessible</li>
          <li>Have your order ID handy if needed</li>
        </ul>
      </div>

      <p>Get ready to enjoy your meal! If you have any questions, our support team is always ready to help.</p>
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
      await sendEmail(user.email, 'Knock, Knock!', 'Your order has been sent out for delivery!', emailHtml);
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

    const order = await Order.findOne({ customId: orderId }).populate('restaurant', 'name location imageUrl').populate('user');
    if (!order) return response.status(404).json({ message: 'Order not found' });

    const user = await User.findById(order.user._id);
    // Fetch restaurant separately for business operations (not exposed to client)
    const restaurant = await Restaurant.findById(order.restaurant._id);
    
    // Helper function to format phone number for SMS
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

      // When user accepts, update the fee to the requested fee
      if (order.requestedFee) {
        order.fee = order.requestedFee;
      }
      
      order.status = 'Confirmed';
      await order.save();

      const userNotification = new Notification({
        userId: user._id,
        message: `Your order ${order.customId} has been confirmed!`,
      });
      await userNotification.save();
      user.notifications.push(userNotification._id);
      await user.save();

      const restaurantNotification = new Notification({
        restaurantId: restaurant._id,
        message: `Order ${order.customId} has been confirmed, ₦${order.totalPrice} has been added to your wallet!`,
      });
      await restaurantNotification.save();
      restaurant.notifications.push(restaurantNotification._id);
      await restaurant.save();
      
      // Send SMS to restaurant about fee approval
      const formattedNumber = formatPhoneNumber(restaurant.contactNumber);
      const foodAmountOnly = order.foodAmount || (order.totalPrice - order.fee);
      const smsMessage = `Fee Approved! Order #${order.customId} fee of ₦${order.fee} was accepted by customer. Meal cost: ₦${foodAmountOnly}. Please prepare order now.`;
      sendSMS(formattedNumber, smsMessage);

      if (user.email) {
        // Email to user about order acceptance
        const userEmailHtml = `
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .order-info { background-color: #d4edda; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .order-info p { color: #000; font-weight: 600; margin: 8px 0; }
    .fee-approval { background-color: #E6B805; color: #000; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; font-size: 18px; }
    .timeline { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .timeline h3 { color: #990000; margin-top: 0; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    .footer .brand { color: #E6B805; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎉 <span class="brand-text">Byte</span> Order Confirmed!</h1>
    </div>
    <div class="content">
      <p>Great news! 🎊</p>
      <p>Your order has been confirmed with the requested delivery fee and is now being prepared!</p>
      
      <div class="fee-approval">
        ✨ Fee Approved & Order Confirmed ✨
      </div>

      <div class="order-info">
        <p>📦 <strong>Order ID:</strong> #${order.customId}</p>
        <p>📊 <strong>Status:</strong> ${order.status}</p>
        <p>💰 <strong>Total Paid:</strong> ₦${(order.totalPrice).toFixed(2)}</p>
        <p>🚚 <strong>Delivery Fee:</strong> ₦${(order.fee).toFixed(2)}</p>
        <p>📝 <strong>Restaurant Note:</strong> ${order.requestDescription || "No special instructions"}</p>
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

      <p>Thank you for accepting the delivery fee and confirming your order. Your food will be on its way soon!</p>
      <p>If you have any questions or concerns, our support team is always ready to help! 🤝</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Making campus dining delightful! 🍕</p>
    </div>
  </div>
</body>
</html>
        `;
        
        // Email to restaurant about order confirmation after fee review
        const restaurantEmailHtml = `
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .success-banner { background-color: #E6B805; color: #000; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; font-size: 18px; }
    .order-info { background-color: #fff3cd; color: #000; border-left: 4px solid #E6B805; padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .order-info p { color: #000; margin: 8px 0; }
    .wallet-update { background-color: #d4edda; color: #000; border-left: 4px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .next-steps { background-color: #d1ecf1; color: #000; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px; font-weight: 600; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    .footer .brand { color: #E6B805; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>💰 <span class="brand-text">Byte</span> Fee Approved!</h1>
    </div>
    <div class="content">
      <p>Great news! 🎊</p>
      <p>The customer has approved your requested delivery fee for order #${order.customId}!</p>
      
      <div class="success-banner">
        ✅ Fee Request Approved & Payment Received ✅
      </div>

      <div class="order-info">
        <p>📦 <strong>Order ID:</strong> #${order.customId}</p>
        <p>📊 <strong>Status:</strong> ${order.status}</p>
        <p>💰 <strong>Total Order Value:</strong> ₦${(order.totalPrice).toFixed(2)}</p>
        <p>🚚 <strong>Approved Fee:</strong> ₦${(order.fee).toFixed(2)}</p>
        <p>📝 <strong>Your Note:</strong> ${order.requestDescription || "No description provided"}</p>
      </div>
      
      <div class="wallet-update">
        <p>💳 <strong>Wallet Update:</strong></p>
        <p>₦${(order.totalPrice).toFixed(2)} has been added to your restaurant wallet!</p>
        <p>New balance: ₦${(restaurant.walletBalance).toFixed(2)}</p>
      </div>

      <div class="next-steps">
        <p><strong>📋 Next Steps:</strong></p>
        <ul>
          <li>Prepare the order immediately</li>
          <li>Package it with care</li>
          <li>Arrange for delivery</li>
          <li>Update the order status as you progress</li>
        </ul>
      </div>

      <p>The customer is now eagerly waiting for their meal. Let's provide an excellent delivery experience! 🚀</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Partner</p>
      <p>Cooking up happiness, one order at a time! 👨‍🍳</p>
    </div>
  </div>
</body>
</html>
        `;
        
        await sendEmail(user.email, 'Order Confirmed - Fee Approved', 'Your order with the requested fee has been confirmed!', userEmailHtml);
        await sendEmail(restaurant.email, 'Fee Approved & Order Confirmed', 'Customer approved your fee request - order is now confirmed!', restaurantEmailHtml);
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
      user.notifications.push(userNotification._id);
      await user.save();

      const restaurantNotification = new Notification({
        restaurantId: restaurant._id,
        message: `Order ${order.customId} has been canceled by the customer due to the fee request.`,
      });
      await restaurantNotification.save();
      restaurant.notifications.push(restaurantNotification._id);
      await restaurant.save();
      
      // Send SMS to restaurant about fee rejection/cancellation
      const formattedNumber = formatPhoneNumber(restaurant.contactNumber);
      const foodAmountOnly = order.foodAmount || (order.totalPrice - (order.requestedFee || order.fee));
      const rejectedFee = order.requestedFee || order.fee;
      const smsMessage = `Fee Rejected! Order #${order.customId} was canceled by customer due to the requested fee of ₦${rejectedFee}. Meal cost was: ₦${foodAmountOnly}. No action needed.`;
      sendSMS(formattedNumber, smsMessage);

      if (user.email) {
        const emailHtml = `
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .order-info { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .order-info p { color: #000; font-weight: 600; margin: 8px 0; }
    .balance-warning { background-color: #E6B805; color: #000; border-radius: 8px; padding: 15px; margin: 20px 0; font-weight: bold; }
    .action-button { background-color: #E6B805; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; margin: 15px 0; text-align: center; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    .footer .brand { color: #E6B805; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>😔 <span class="brand-text">Byte</span> Order Update</h1>
    </div>
    <div class="content">
      <p>Hi there! 👋</p>
      <p>We're sorry to inform you that your order has been canceled due to insufficient balance in your Byte wallet.</p>
      
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
        await sendEmail(user.email, 'Order Cancelled', 'Your order has been canceled', emailHtml);
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #E6B805; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .order-info { background-color: #f8f8f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .order-info p { color: #333333; font-weight: bold; margin: 8px 0; }
    .footer { text-align: center; font-size: 12px; color: #999999; margin-top: 20px; }
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

// Helper to format phone numbers for SMS
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
// New: Order for non-app user (external recipient)
exports.createOrderForExternalRecipient = async (request, response) => {
    let { meals, note, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark, fee, recipientName, recipientPhone, recipientEmail } = request.body;
    const userId = request.user._id;

    try {
        const restaurant = await findRestaurantByIdHelper(restaurantCustomId);
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        if (!restaurant.isActive) {
            return response.status(403).json({ message: 'Restaurant is currently closed' });
        }
        if (!recipientName || !recipientPhone) {
            return response.status(400).json({ message: 'Recipient name and phone are required for external orders.' });
        }
        if(!phoneNumber){
          phoneNumber = recipientPhone
        }
        if (!location) {
            return response.status(400).json({ message: 'Delivery location and phone number are required.' });
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
            user: userId,
            meals: mealDetails,
            note,
            totalPrice,
            foodAmount: totalPrice - (fee || 0),
            location,
            nearestLandmark,
            phoneNumber,
            restaurant: restaurant._id,
            fee,
            recipient: {
                name: recipientName,
                phone: recipientPhone,
                instructions: `Order for external recipient${recipientEmail ? ' (' + recipientEmail + ')' : ''}`,
            },
        });
        await newOrder.save();
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return response.status(404).json({ message: 'User not found' });
        }
        if (userDoc.byteBalance < totalPrice) {
            return response.status(400).json({
                message: 'Insufficient balance. Please top up your Byte wallet before placing an order.',
                currentBalance: userDoc.byteBalance,
                requiredAmount: totalPrice
            });
        }
        // Notify ordering user only
        const userNotification = new Notification({
            userId: userDoc._id,
            message: `You placed an order for ${recipientName} (external recipient)! Order ID: ${newOrder.customId}.`,
        });
        await userNotification.save();
        userDoc.notifications.push(userNotification._id);
        userDoc.orderHistory.push(newOrder._id);
        await userDoc.save();
        // Notify restaurant (email, SMS, notification)
        const restaurantNotification = new Notification({
            restaurantId: restaurant._id,
            message: `You have received a new external gift order with ID: ${newOrder.customId}.`,
        });
        await restaurantNotification.save();
        restaurant.notifications.push(restaurantNotification._id);
        await restaurant.save();
        // Send SMS to restaurant
        const foodAmountForSMS = totalPrice - (fee || 0);
        const smsMessage = `New order #${newOrder.customId}! Items: ${meals.length}, Meal cost: ₦${foodAmountForSMS}. ${note ? 'Note: ' + note.substring(0, 30) + (note.length > 30 ? '...' : '') : ''} Delivery: ${location.substring(0, 20)}${location.length > 20 ? '...' : ''}. Check dashboard now.`;
        const formattedRestaurantNumber = formatPhoneNumber(restaurant.contactNumber);
        sendSMS(formattedRestaurantNumber, smsMessage);
        // Send email to restaurant
        const restaurantEmailHtml = `
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
            .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
            .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .brand-text, .brand { color: #E6B805; font-weight: bold; }
            .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
            .content p { margin: 15px 0; }
            .order-details, .order-info, .fee-info, .wallet-update, .success-box, .delivery-banner, .balance-warning, .next-steps, .surprise-box { background-color: #E6B805; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .alert-box { background-color: #990000; color: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>🍽️ New <span class="brand-text">Byte</span> Order!</h1>
            </div>
            <div class="content">
              <p>Exciting news! 🎉 You have received a new order from a hungry customer!</p>
              <div class="order-details">
                <p>📍 <strong>Delivery Location:</strong> ${location}</p>
                <p>🏘️ <strong>Nearest Landmark:</strong> ${nearestLandmark || 'Not specified'}</p>
                <p>📱 <strong>Contact Phone:</strong> ${phoneNumber}</p>
                <p>📝 <strong>Special Instructions:</strong> ${note || 'No special notes'}</p>
                <p>👤 <strong>Recipient:</strong> ${recipientName}</p>
                <p>🛒 <strong>Ordered by:</strong> ${userDoc.username}</p>
              </div>
              <div class="alert-box">
                <p><strong>📋 Next Steps:</strong></p>
                <ul>
                  <li>Check your restaurant dashboard for full meal details</li>
                  <li>Prepare the order with care</li>
                  <li>Contact the recipient if needed</li>
                  <li>Update order status as you progress</li>
                </ul>
              </div>
              <p>Let's make this customer's day delicious! 🚀</p>
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
            restaurantEmailHtml
        );
        // Send SMS to external recipient
        const formattedRecipientNumber = formatPhoneNumber(recipientPhone);
        const recipientSMS = `Hi ${recipientName}, you have a Byte food delivery coming! Order ID: ${newOrder.customId}. Delivery to: ${location}. Contact: ${phoneNumber}. Enjoy your meal!`;
        sendSMS(formattedRecipientNumber, recipientSMS);
        // Send email to external recipient if provided
        if (recipientEmail) {
            const recipientEmailHtml = `
            <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
                .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
                .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                .brand-text, .brand { color: #E6B805; font-weight: bold; }
                .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
                .content p { margin: 15px 0; }
                .surprise-box { background-color: #E6B805; color: #000; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; font-size: 18px; }
                .order-details { background-color: #d4edda; color: #000; border-left: 4px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: 600; }
                .order-details p { color: #000; margin: 8px 0; }
                .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="email-container">
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
                    <p><strong>📍 Delivery to:</strong> ${location}</p>
                    <p><strong>📱 Contact:</strong> ${phoneNumber}</p>
                    <p><strong>🏘️ Landmark:</strong> ${nearestLandmark || 'Not specified'}</p>
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
                recipientEmail,
                'Someone Ordered Food For You!',
                `${userDoc.username} has ordered food for you through Byte!`,
                recipientEmailHtml
            );
        }
        // Return response
        return response.status(201).json({
            message: `Order created successfully for external recipient ${recipientName}!`,
            order: newOrder,
            recipientInfo: {
                name: recipientName,
                phone: recipientPhone,
                email: recipientEmail || null,
            }
        });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Place a new order by referencing another order's customId
exports.createOrderByOrderCustomId = async (req, res) => {
    const { orderCustomId } = req.body;
    const userId = req.user._id;
    const { note, location, phoneNumber, nearestLandmark, fee, mealsOverride } = req.body;

    if (!orderCustomId) {
        return res.status(400).json({ message: 'orderCustomId is required.' });
    }
    try {
        // Find the referenced order
        const refOrder = await require('../models/Orders').findOne({ customId: orderCustomId }).populate('meals.meal').populate('restaurant', 'name location imageUrl isActive');
        if (!refOrder) {
            return res.status(404).json({ message: 'Referenced order not found.' });
        }
        // Use the same restaurant and meals (allow override)
        const restaurant = refOrder.restaurant;
        if (!restaurant || !restaurant.isActive) {
            return res.status(400).json({ message: 'Referenced restaurant is not available.' });
        }
        // Use meals from referenced order, or override if provided
        let meals = refOrder.meals.map(m => ({ mealId: m.meal.customId, quantity: m.quantity }));
        if (Array.isArray(mealsOverride) && mealsOverride.length > 0) {
            meals = mealsOverride;
        }
        // Calculate total price
        let totalPrice = 0;
        for (const m of meals) {
            const mealDoc = await require('../models/Meals').findOne({ customId: m.mealId });
            if (!mealDoc) return res.status(400).json({ message: `Meal with customId ${m.mealId} not found.` });
            totalPrice += (mealDoc.price || 0) * (m.quantity || 1);
        }
        totalPrice += parseFloat(fee || refOrder.fee || 0);
        // Use delivery info from referenced order, or override
        const user = await require('../models/User').findById(userId);
        const finalLocation = location || user.location || refOrder.location;
        const finalPhone = phoneNumber || user.phoneNumber || refOrder.phoneNumber;
        const finalLandmark = nearestLandmark || user.nearestLandmark || refOrder.nearestLandmark;
        if (!finalLocation || !finalPhone) {
            return res.status(400).json({ message: 'Delivery location and phone number are required.' });
        }
        // Check user balance
        if (user.byteBalance < totalPrice) {
            return res.status(400).json({ message: 'Insufficient balance. Please top up your Byte wallet before placing an order.', currentBalance: user.byteBalance, requiredAmount: totalPrice });
        }
        // Create the new order
        const mealDetails = await Promise.all(meals.map(async ({ mealId, quantity }) => {
            const meal = await require('../models/Meals').findOne({ customId: mealId });
            if (!meal) throw new Error(`Meal with customId ${mealId} not found`);
            return { meal: meal._id, quantity };
        }));
        const newOrder = new (require('../models/Orders'))({
            user: userId,
            meals: mealDetails,
            note: note || refOrder.note,
            totalPrice,
            foodAmount: totalPrice - (fee || refOrder.fee || 0),
            location: finalLocation,
            nearestLandmark: finalLandmark,
            phoneNumber: finalPhone,
            restaurant: restaurant._id,
            fee: parseFloat(fee || refOrder.fee || 0),
        });
        await newOrder.save();
        // Update user balance and notifications
        user.byteBalance -= totalPrice;
        user.orderHistory.push(newOrder._id);
        await user.save();
        // Notify restaurant
        const Notification = require('../models/Notifications');
        const restaurantNotification = new Notification({
            restaurantId: restaurant._id,
            message: `You have received a new order (by reference) with ID: ${newOrder.customId}.`,
        });
        await restaurantNotification.save();
        restaurant.notifications.push(restaurantNotification._id);
        await restaurant.save();
        res.status(201).json({ message: 'Order placed successfully by reference.', order: newOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

