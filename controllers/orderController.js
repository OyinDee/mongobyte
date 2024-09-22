const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');
const sendEmail = require('../configs/nodemailer');
const User = require('../models/User');
const Meal = require('../models/Meals')
const Nofifications = require('../models/Notifications')

exports.createOrder = async (request, response) => {
    const { user, meals, note, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark, fee } = request.body[0];
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
        userDoc.orderHistory.push(newOrder._id);
        await userDoc.save();
        const restaurantNotification = new Notification({
          restaurantId: restaurant._id,
          message: `You have received a new order with ID: ${newOrder._id}.`,
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
              <p>Total Price: ${totalPrice}0 naira</p>
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
      
        if (!orders.length) {
            return response.status(404).json({ message: 'No orders found for this restaurant' });
        }

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
    var order = await Order.find({customId: orderId})
      .populate('user meals.meal restaurant');

    order = order[0]
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
      const parsedFee = parseFloat(additionalFee)

      if ((parsedFee/10) <= order.fee) {
        order.totalPrice += parsedFee
        order.status = 'Confirmed';
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
      width: 85%;
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
      <p>Note: ${order.requestDescription || "Nill"}</p>
    </div>

    <p>Please log in to approve or contact support if you have any questions.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
    </div>
  </div>
</body>
</html>

          `;
          await sendEmail(user.email, 'Order Additional Fee Request', 'Your order has a fee request that requires approval.', emailHtml);
        }
        return response.status(400).json({ message: 'Additional fee exceeds allowed limit. User notified to log in and approve.' });
      }
    }


    await order.save();
    const restaurantNotification = new Notification({
      restaurantId: restaurant._id,
      message: `Order ${order.customId} has been confirmed and should be delivered soon.`,
  });
  await restaurantNotification.save();
  restaurant.notifications.push(restaurantNotification._id);
  await restaurant.save();

  const userNotification = new Notification({
      userId: order.user._id,
      message: `Your order ${order.customId} has been confirmed and will reach you soon!`,
  });
  await userNotification.save();
  const user = await User.findById(order.user._id);
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
      width: 85%;
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
      <p>Total Price: ₦${(order.totalPrice * 10).toFixed(2)} (including any additional fees)</p>
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

    return response.status(200).json({ message: 'Order updated successfully!', order });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
