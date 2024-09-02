const Restaurant = require('../models/Restaurants');

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

// Get all restaurants
exports.getAllRestaurants = async (request, response) => {
    try {
        const restaurants = await Restaurant.find().populate('meals');
        response.json(restaurants);
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

// Update a restaurant
exports.updateRestaurant = async (request, response) => {
    const { id } = request.params;
    try {
        const restaurant = await Restaurant.findOneAndUpdate({ customId: id }, request.body, { new: true });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        response.json({ message: 'Restaurant updated successfully!', restaurant });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

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


// Update order status
exports.updateOrderStatus = async (request, response) => {
    const { orderId } = request.params;
    const { status } = request.body;

    try {
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true });
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
