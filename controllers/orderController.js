const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');
const sendEmail = require('../configs/nodemailer');
const User = require('../models/User');
const Meal = require('../models/Meals')


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

        const orders = await Order.find({ meals: { $in: restaurant.meals } }).populate('user meals.meal');
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
