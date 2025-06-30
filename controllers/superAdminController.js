const { getBreakdown } = require('./restaurantRevenueHelpers');
// Get total and breakdown revenue for all orders (global)
exports.getGlobalRevenue = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('restaurant', 'name');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const breakdown = await getBreakdown(orders, true);
    res.json({ totalRevenue, breakdown });
  } catch (error) {
    console.error('getGlobalRevenue error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const Restaurant = require('../models/Restaurants')
const Order = require('../models/Orders')

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


exports.getAllOrders = async (request, response) => {
    try {
        const orders = await Order.find().populate('user', 'username email').populate('meals.meal').populate('restaurant', 'name');
        // Add restaurantName to each order
        const ordersWithRestaurantName = orders.map(order => {
            const obj = order.toObject();
            obj.restaurantName = order.restaurant && order.restaurant.name ? order.restaurant.name : undefined;
            return obj;
        });
        response.json(ordersWithRestaurantName);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.getOrderById = async (request, response) => {
    const { orderId } = request.params;

    try {
        const order = await Order.findById(orderId).populate('user', 'username email').populate('meals.meal').populate('restaurant', 'name');
        if (!order) {
            return response.status(404).json({ message: 'Order not found' });
        }
        const obj = order.toObject();
        obj.restaurantName = order.restaurant && order.restaurant.name ? order.restaurant.name : undefined;
        response.json(obj);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

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