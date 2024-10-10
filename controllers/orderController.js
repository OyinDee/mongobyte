const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');
const sendEmail = require('../configs/nodemailer');
const User = require('../models/User');
const Meal = require('../models/Meals')
const Notification = require('../models/Notifications')

exports.createOrder = async (request, response) => {
    const { user, meals, note, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark, fee } = request.body;
    try {
        const restaurant = await Restaurant.findOne({ customId: restaurantCustomId });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
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
            location,
            phoneNumber,
            restaurant: restaurant._id, 
            fee
        });

        await newOrder.save();

        const userDoc = await User.findById(user);
        if (!userDoc) {
            return response.status(404).json({ message: 'User not found' });
        }
        const userNotification = new Notification({
          userId: userDoc._id,
          message: `You must be hungry, you placed a new order! It has an ID of ${newOrder.customId}. Watch out for it!`,
        });
        await userNotification.save();
        
        userDoc.notifications.push(userNotification._id);
        userDoc.orderHistory.push(newOrder._id);
        await userDoc.save();
        const restaurantNotification = new Notification({
          restaurantId: restaurant._id,
          message: `You have received a new order with ID: ${newOrder.customId}.`,
      });
      await restaurantNotification.save();
      restaurant.notifications.push(restaurantNotification._id);
      await restaurant.save();
        const emailHtml = `
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
            }
            .container {
              width: 85%;
              max-width: 600px;
              margin: 20px auto;
              padding: 20px;
              border: 1px solid #dddddd;
              border-radius: 8px;
              background-color: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #dddddd;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #000000;
            }
            .content {
              font-size: 16px;
              line-height: 1.5;
            }
            .content p {
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 14px;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Order Received</h1>
            </div>
            <div class="content">
              <p>You have received a new order.</p>
              <p><strong>Order Details:</strong></p>
              <p>Location: ${location}, around ${nearestLandmark || '...'}</p>
              <p>Phone: ${phoneNumber}</p>
              <p>Please check the dashboard for meal details.</p>
              <p><strong>Note:</strong> ${note || 'No special notes'}</p>
            </div>
            <div class="footer">
              <p>Thank you for your attention.</p>
              <p>&copy; ${new Date().getFullYear()} Byte</p>
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

        return response.status(201).json({
            message: 'Order created successfully, and notification sent to the restaurant!',
            order: newOrder,
        });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


exports.getOrdersByRestaurant = async (request, response) => {
    const { customId } = request.params;

    try {
        const restaurant = await Restaurant.findOne({ customId }).populate('meals');
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

      order.totalPrice = (order.totalPrice-order.fee)+(parsedFee);
      
      if ((parsedFee) <= order.fee) {
        order.status = 'Confirmed';
        order.fee = (parsedFee);
      } else {
       
        order.status = 'Fee Requested';

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
              .fee-info {
                background-color: #f8f8f8;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .fee-info p {
                color: #333333;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #999999;
                margin-top: 20px;
              }
              .highlight {
                color: #d9534f;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <h1>Order Fee Request</h1>
              <p>Your order with ID <strong>${order.customId}</strong> has a fee request that exceeds the permitted limit.</p>
            
              <div class="fee-info">
                <p>Additional Fee Requested: <span class="highlight">₦${parsedFee}</span></p>
                <p>Permitted Fee: ₦${order.fee}</p>
                <p>Note: ${requestDescription || "No attatched description"}</p>
              </div>

              <p>Please log in and check your order history to approve or cancel this order or contact support if you have any questions.</p>

              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
          `;
          await sendEmail(user.email, 'Order Additional Fee Request', 'Your order has a fee request that requires approval.', emailHtml); 
           order.fee = (parsedFee);
        }
        await order.save();
        const userNotification = new Notification({
          userId: user._id,
          message: `For order ${order.customId}, requested fee is higher than permitted fee, check your order history! .`,
        });
        await userNotification.save();
        
        user.notifications.push(userNotification._id);
        await user.save();
  
        return response.status(400).json({ message: 'Additional fee exceeds allowed limit. User notified to log in and approve.' });
      }
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
    <h1>Order Cancelled</h1>
    <p>Your order has been cancelled due to insufficient balance.</p>
    
    <div class="order-info">
      <p>Order ID: ${order.customId}</p>
      <p>Status: ${order.status}</p>
      <p>Total Price: ₦${(order.totalPrice).toFixed(2)} (including any additional fees)</p>
                <p>Note: ${requestDescription || "No attatched description"}</p>

    </div>

    <p>Please top up your balance and place the order again if you wish.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
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
    <h1>Order Update</h1>
    <p>Your order has been successfully confirmed and should reach you soon!</p>
    
    <div class="order-info">
      <p>Order ID: ${order.customId}</p>
      <p>Status: ${order.status}</p>
      <p>Total Price: ₦${(order.totalPrice).toFixed(2)} (including any additional fees)</p>
                <p>Note: ${requestDescription || "No attatched description"}</p>

    </div>

    <p>Thank you for your order. If you have any questions or concerns, feel free to reach out to our support team.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
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
      message: `Your order ${order.customId} has been delivered!`,
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
      <p>Status: Delivered</p>
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

