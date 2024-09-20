const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');
const sendEmail = require('../configs/nodemailer');
const User = require('../models/User');


exports.createOrder = async (request, response) => {
    const { user, meals, note, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark } = request.body;

    try {

        const restaurant = await Restaurant.findOne({ customId: restaurantCustomId });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }


        const mealDetails = await Promise.all(
            meals.map(async ({ mealCustomId, quantity }) => {
                const meal = await Meal.findOne({ customId: mealCustomId });
                if (!meal) {
                    throw new Error(`Meal with customId ${mealCustomId} not found`);
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
        });

        await newOrder.save();

        const userDoc = await User.findById(user);
        if (!userDoc) {
            return response.status(404).json({ message: 'User not found' });
        }
        userDoc.orderHistory.push(newOrder._id);
        await userDoc.save();

        await sendEmail(
            restaurant.email,
            'New Order Received',
            `You have received a new order. Order details: \nTotal Price: ${totalPrice} \nLocation: ${location}, around ${nearestLandmark|| "..."} \nPhone: ${phoneNumber} \nNote: ${note || 'No special notes'}`
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
