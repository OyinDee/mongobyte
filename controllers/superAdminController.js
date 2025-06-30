const User = require('../models/User');
const Withdrawal = require('../models/Withdrawals');
const mongoose = require('mongoose');
// GET /api/superadmin/dashboard?range=week|month|year
exports.getDashboard = async (req, res) => {
  try {
    const range = req.query.range || 'week';
    const now = new Date();
    let startDate;
    if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else { // week
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0,0,0,0);
    }

    // Stats
    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalRevenue,
      pendingOrders,
      pendingWithdrawals,
      activeRestaurants
    ] = await Promise.all([
      User.countDocuments(),
      Restaurant.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalPrice" } } }]).then(r => r[0]?.total || 0),
      Order.countDocuments({ status: 'Pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Restaurant.countDocuments({ isActive: true })
    ]);

    // Growth (week/month/year)
    const [
      prevUsers,
      prevOrders,
      prevRevenue
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $lt: startDate } }),
      Order.countDocuments({ createdAt: { $lt: startDate } }),
      Order.aggregate([
        { $match: { createdAt: { $lt: startDate } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]).then(r => r[0]?.total || 0)
    ]);
    const userGrowth = totalUsers - prevUsers;
    const orderGrowth = totalOrders - prevOrders;
    const revenueGrowth = totalRevenue - prevRevenue;

    // Recent orders (last 10)
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'username email')
      .populate('restaurant', 'name')
      .select('_id user restaurant totalPrice status createdAt');

    // Recent users (last 10)
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id username email createdAt');

    // Top restaurants (by order count and revenue)
    const topRestaurantsAgg = await Order.aggregate([
      { $group: {
        _id: "$restaurant",
        orderCount: { $sum: 1 },
        revenue: { $sum: "$totalPrice" }
      }},
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);
    const restaurantIds = topRestaurantsAgg.map(r => r._id);
    const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } })
      .select('_id name imageUrl university');
    const topRestaurants = topRestaurantsAgg.map(r => {
      const rest = restaurants.find(rest => rest._id.equals(r._id));
      return rest ? {
        _id: rest._id,
        name: rest.name,
        imageUrl: rest.imageUrl,
        university: rest.university,
        orderCount: r.orderCount,
        revenue: r.revenue
      } : null;
    }).filter(Boolean);

    // Pending withdrawals (last 10)
    const pendingWithdrawalsArr = await Withdrawal.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        totalUsers,
        totalRestaurants,
        totalOrders,
        totalRevenue,
        pendingOrders,
        pendingWithdrawals,
        activeRestaurants,
        orderGrowth,
        userGrowth,
        revenueGrowth
      },
      recentOrders,
      recentUsers,
      topRestaurants,
      pendingWithdrawals: pendingWithdrawalsArr
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
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