

// Delete a restaurant
exports.deleteRestaurant = async (request, response) => {
    const { id } = request.params;
    try {
        const restaurant = await Restaurant.findOneAndDelete({ customId: id });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        response.json({ message: 'Restaurant deleted successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Create a new restaurant
exports.createRestaurant = async (request, response) => {
    try {
        const restaurant = new Restaurant(request.body);
        await restaurant.save();
        response.status(201).json({ message: 'Restaurant created successfully!', restaurant });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


// Get a single restaurant by customId
exports.getRestaurantById = async (request, response) => {
    const { id } = request.params;
    try {
        const restaurant = await Restaurant.findOne({ customId: id }).populate('meals');
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        response.json(restaurant);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Get user's orders
exports.getUserOrders = async (request, response) => {
    const userId = request.user.id;

    try {
        const orders = await Order.find({ user: userId }).populate('meals.meal');
        response.json(orders);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Update order status
exports.updateOrderStatus = async (request, response) => {
    const { orderId } = request.params;
    const { status } = request.body;

    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true, runValidators: true }
        );

        if (!order) {
            return response.status(404).json({ message: 'Order not found' });
        }

        response.json({
            message: 'Order status updated successfully',
            order,
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};
const Order = require('../models/Order');
const Meal = require('../models/Meal');

// Create a new order
exports.createOrder = async (request, response) => {
    const userId = request.user.id; // Assuming user ID is available in request after authentication
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

// Get all orders
exports.getAllOrders = async (request, response) => {
    try {
        const orders = await Order.find().populate('user', 'username email').populate('meals.meal');
        response.json(orders);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Get a specific order by ID
exports.getOrderById = async (request, response) => {
    const { orderId } = request.params;

    try {
        const order = await Order.findById(orderId).populate('user', 'username email').populate('meals.meal');
        if (!order) {
            return response.status(404).json({ message: 'Order not found' });
        }
        response.json(order);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Delete an order
exports.deleteOrder = async (request, response) => {
    const { orderId } = request.params;

    try {
        const order = await Order.findByIdAndDelete(orderId);
        if (!order) {
            return response.status(404).json({ message: 'Order not found' });
        }
        response.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};