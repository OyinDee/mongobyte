const { ScheduledOrder, GroupOrder } = require('../models/AdvancedOrders');
const Order = require('../models/Orders');
const Restaurant = require('../models/Restaurants');
const Notification = require('../models/Notifications');
const User = require('../models/User');

// Get restaurant's scheduled orders
const getRestaurantScheduledOrders = async (req, res) => {
    try {
        const restaurantId = req.restaurant._id;
        const { page = 1, limit = 10, status, startDate, endDate } = req.query;

        const filter = { restaurant: restaurantId };
        
        if (status) {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.scheduledFor = {};
            if (startDate) filter.scheduledFor.$gte = new Date(startDate);
            if (endDate) filter.scheduledFor.$lte = new Date(endDate);
        }

        const scheduledOrders = await ScheduledOrder.find(filter)
            .populate('user', 'username phoneNumber location nearestLandmark')
            .populate('meals.meal', 'name price imageUrl')
            .sort({ scheduledFor: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await ScheduledOrder.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: scheduledOrders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalOrders: total,
                ordersPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get restaurant scheduled orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scheduled orders',
            error: error.message
        });
    }
};

// Accept or decline a scheduled order
const updateScheduledOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, reason } = req.body; // status: 'processing', 'cancelled'
        const restaurantId = req.restaurant._id;

        if (!['processing', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "processing" or "cancelled"'
            });
        }

        const scheduledOrder = await ScheduledOrder.findOne({
            _id: orderId,
            restaurant: restaurantId
        }).populate('user', 'username phoneNumber');

        if (!scheduledOrder) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled order not found'
            });
        }

        if (scheduledOrder.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Can only update orders with "scheduled" status'
            });
        }

        scheduledOrder.status = status;
        if (reason) {
            scheduledOrder.note = (scheduledOrder.note || '') + ` | Restaurant note: ${reason}`;
        }
        
        await scheduledOrder.save();

        // Create notification for user
        const notification = new Notification({
            userId: scheduledOrder.user._id,
            message: status === 'processing' 
                ? `Your scheduled order for ${new Date(scheduledOrder.scheduledFor).toLocaleDateString()} has been accepted by the restaurant.`
                : `Your scheduled order has been cancelled. ${reason ? 'Reason: ' + reason : ''}`,
            isRead: false
        });
        await notification.save();

        res.status(200).json({
            success: true,
            message: `Scheduled order ${status === 'processing' ? 'accepted' : 'cancelled'} successfully`,
            data: scheduledOrder
        });

    } catch (error) {
        console.error('Update scheduled order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating scheduled order status',
            error: error.message
        });
    }
};

// Get restaurant's group orders
const getRestaurantGroupOrders = async (req, res) => {
    try {
        const restaurantId = req.restaurant._id;
        const { page = 1, limit = 10, status, deadline } = req.query;

        const filter = { restaurant: restaurantId };
        
        if (status) {
            filter.status = status;
        }

        if (deadline) {
            filter.orderDeadline = { $lte: new Date(deadline) };
        }

        const groupOrders = await GroupOrder.find(filter)
            .populate('creator', 'username phoneNumber')
            .populate('participants.user', 'username phoneNumber')
            .populate('participants.meals.meal', 'name price imageUrl')
            .sort({ orderDeadline: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await GroupOrder.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: groupOrders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalOrders: total,
                ordersPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get restaurant group orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching group orders',
            error: error.message
        });
    }
};

// Accept or decline a group order
const updateGroupOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, reason } = req.body; // status: 'accepted', 'declined'
        const restaurantId = req.restaurant._id;

        if (!['accepted', 'declined'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "accepted" or "declined"'
            });
        }

        const groupOrder = await GroupOrder.findOne({
            _id: orderId,
            restaurant: restaurantId
        }).populate('creator', 'username phoneNumber')
        .populate('participants.user', 'username phoneNumber');

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        if (groupOrder.status !== 'ready') {
            return res.status(400).json({
                success: false,
                message: 'Can only update orders with "ready" status'
            });
        }

        groupOrder.status = status === 'accepted' ? 'confirmed' : 'cancelled';
        if (reason) {
            groupOrder.note = (groupOrder.note || '') + ` | Restaurant note: ${reason}`;
        }
        
        await groupOrder.save();

        // Create notifications for all participants
        const participants = [groupOrder.creator, ...groupOrder.participants.map(p => p.user)];
        const notifications = participants.map(user => new Notification({
            userId: user._id,
            message: status === 'accepted'
                ? `Your group order "${groupOrder.title}" has been accepted by the restaurant.`
                : `Your group order "${groupOrder.title}" has been declined. ${reason ? 'Reason: ' + reason : ''}`,
            isRead: false
        }));

        await Notification.insertMany(notifications);

        // If accepted, create individual orders for each participant
        if (status === 'accepted') {
            const individualOrders = [];
            
            for (const participant of groupOrder.participants) {
                if (participant.meals.length > 0) {
                    const individualOrder = new Order({
                        user: participant.user._id,
                        restaurant: restaurantId,
                        meals: participant.meals,
                        totalPrice: participant.subtotal,
                        fee: groupOrder.deliveryFee / groupOrder.participants.length, // Split delivery fee
                        status: 'pending',
                        paymentStatus: 'pending',
                        location: groupOrder.deliveryInfo.address,
                        nearestLandmark: groupOrder.deliveryInfo.landmark,
                        note: `Group Order: ${groupOrder.title}`,
                        groupOrderId: groupOrder._id
                    });
                    
                    individualOrders.push(individualOrder);
                }
            }
            
            if (individualOrders.length > 0) {
                await Order.insertMany(individualOrders);
            }
        }

        res.status(200).json({
            success: true,
            message: `Group order ${status} successfully`,
            data: groupOrder
        });

    } catch (error) {
        console.error('Update group order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating group order status',
            error: error.message
        });
    }
};

// Get restaurant dashboard stats for advanced orders
const getAdvancedOrdersStats = async (req, res) => {
    try {
        const restaurantId = req.restaurant._id;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Scheduled orders stats
        const scheduledOrdersStats = await ScheduledOrder.aggregate([
            { $match: { restaurant: restaurantId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totalPrice' }
                }
            }
        ]);

        // Group orders stats
        const groupOrdersStats = await GroupOrder.aggregate([
            { $match: { restaurant: restaurantId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totalAmount' }
                }
            }
        ]);

        // Today's scheduled orders
        const todaysScheduledOrders = await ScheduledOrder.countDocuments({
            restaurant: restaurantId,
            scheduledFor: { $gte: startOfDay, $lte: endOfDay }
        });

        // Pending group orders (ready for restaurant review)
        const pendingGroupOrders = await GroupOrder.countDocuments({
            restaurant: restaurantId,
            status: 'ready'
        });

        res.status(200).json({
            success: true,
            data: {
                scheduledOrders: {
                    stats: scheduledOrdersStats,
                    todaysOrders: todaysScheduledOrders
                },
                groupOrders: {
                    stats: groupOrdersStats,
                    pendingOrders: pendingGroupOrders
                }
            }
        });

    } catch (error) {
        console.error('Get advanced orders stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching advanced orders statistics',
            error: error.message
        });
    }
};

// Mark scheduled order as completed (when prepared and ready)
const markScheduledOrderCompleted = async (req, res) => {
    try {
        const { orderId } = req.params;
        const restaurantId = req.restaurant._id;

        const scheduledOrder = await ScheduledOrder.findOne({
            _id: orderId,
            restaurant: restaurantId,
            status: 'processing'
        }).populate('user', 'username phoneNumber');

        if (!scheduledOrder) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled order not found or not in processing status'
            });
        }

        scheduledOrder.status = 'completed';
        await scheduledOrder.save();

        // Create notification for user
        const notification = new Notification({
            userId: scheduledOrder.user._id,
            message: `Your scheduled order is ready for pickup/delivery.`,
            isRead: false
        });
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Scheduled order marked as completed',
            data: scheduledOrder
        });

    } catch (error) {
        console.error('Mark scheduled order completed error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking scheduled order as completed',
            error: error.message
        });
    }
};

module.exports = {
    getRestaurantScheduledOrders,
    updateScheduledOrderStatus,
    getRestaurantGroupOrders,
    updateGroupOrderStatus,
    getAdvancedOrdersStats,
    markScheduledOrderCompleted
};
