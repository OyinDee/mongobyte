const { ScheduledOrder, GroupOrder, Referral, QuickReorder } = require('../models/AdvancedOrders');
const Order = require('../models/Orders');
const User = require('../models/User');
const Restaurant = require('../models/Restaurants');
const Meal = require('../models/Meals');
const Notification = require('../models/Notifications');
const generateId = require('../utils/generateID');

// ===== SCHEDULED ORDERS =====

// Create a scheduled order
const createScheduledOrder = async (req, res) => {
    try {
        const {
            meals,
            restaurant,
            scheduledFor,
            repeatType,
            repeatDays,
            endDate,
            note,
            recipient
        } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!meals || !restaurant || !scheduledFor) {
            return res.status(400).json({
                success: false,
                message: 'Meals, restaurant, and scheduled time are required'
            });
        }

        // Validate scheduled time is in the future
        if (new Date(scheduledFor) <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled time must be in the future'
            });
        }

        // Calculate total price
        let totalPrice = 0;
        const mealDetails = await Promise.all(meals.map(async (mealItem) => {
            const meal = await Meal.findById(mealItem.meal);
            if (!meal) {
                throw new Error(`Meal with ID ${mealItem.meal} not found`);
            }
            totalPrice += meal.price * mealItem.quantity;
            return { meal: meal._id, quantity: mealItem.quantity };
        }));

        // Calculate next execution time for recurring orders
        let nextExecution = new Date(scheduledFor);
        if (repeatType !== 'none') {
            nextExecution = calculateNextExecution(new Date(scheduledFor), repeatType, repeatDays);
        }

        const scheduledOrder = new ScheduledOrder({
            user: userId,
            meals: mealDetails,
            restaurant,
            scheduledFor: new Date(scheduledFor),
            repeatType: repeatType || 'none',
            repeatDays: repeatDays || [],
            endDate: endDate ? new Date(endDate) : null,
            totalPrice,
            note,
            recipient: recipient || {},
            nextExecution: repeatType !== 'none' ? nextExecution : new Date(scheduledFor)
        });

        await scheduledOrder.save();

        const populatedOrder = await ScheduledOrder.findById(scheduledOrder._id)
            .populate('user', 'username email')
            .populate('restaurant', 'name')
            .populate('meals.meal', 'name price');

        res.status(201).json({
            success: true,
            message: 'Scheduled order created successfully',
            data: populatedOrder
        });

    } catch (error) {
        console.error('Create scheduled order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating scheduled order',
            error: error.message
        });
    }
};

// Get user's scheduled orders
const getUserScheduledOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user._id;

        const filter = { user: userId };
        if (status) filter.status = status;

        const skip = (page - 1) * limit;

        const orders = await ScheduledOrder.find(filter)
            .populate('restaurant', 'name imageUrl')
            .populate('meals.meal', 'name price imageUrl')
            .sort({ scheduledFor: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ScheduledOrder.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get scheduled orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching scheduled orders',
            error: error.message
        });
    }
};

// Cancel scheduled order
const cancelScheduledOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const order = await ScheduledOrder.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Scheduled order not found'
            });
        }

        order.status = 'cancelled';
        order.isActive = false;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Scheduled order cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel scheduled order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling scheduled order',
            error: error.message
        });
    }
};

// ===== GROUP ORDERS =====

// Create a group order
const createGroupOrder = async (req, res) => {
    try {
        const {
            title,
            description,
            restaurant,
            orderDeadline,
            deliveryTime,
            deliveryInfo,
            maxParticipants,
            minOrderAmount,
            splitMethod,
            isPublic
        } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!title || !restaurant || !orderDeadline || !deliveryInfo) {
            return res.status(400).json({
                success: false,
                message: 'Title, restaurant, order deadline, and delivery info are required'
            });
        }

        // Validate deadline is in the future
        if (new Date(orderDeadline) <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Order deadline must be in the future'
            });
        }

        const groupOrder = new GroupOrder({
            creator: userId,
            title,
            description,
            restaurant,
            orderDeadline: new Date(orderDeadline),
            deliveryTime: deliveryTime ? new Date(deliveryTime) : null,
            deliveryInfo,
            maxParticipants: maxParticipants || 10,
            minOrderAmount: minOrderAmount || 0,
            splitMethod: splitMethod || 'individual',
            isPublic: isPublic !== false,
            participants: [{
                user: userId,
                meals: [],
                subtotal: 0,
                hasPaid: false
            }]
        });

        await groupOrder.save();

        const populatedOrder = await GroupOrder.findById(groupOrder._id)
            .populate('creator', 'username')
            .populate('restaurant', 'name imageUrl')
            .populate('participants.user', 'username');

        res.status(201).json({
            success: true,
            message: 'Group order created successfully',
            data: populatedOrder
        });

    } catch (error) {
        console.error('Create group order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating group order',
            error: error.message
        });
    }
};

// Join a group order
const joinGroupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId);

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        if (groupOrder.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'Group order is no longer accepting participants'
            });
        }

        if (groupOrder.participants.length >= groupOrder.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: 'Group order is full'
            });
        }

        // Check if user already joined
        const existingParticipant = groupOrder.participants.find(
            p => p.user.toString() === userId.toString()
        );

        if (existingParticipant) {
            return res.status(400).json({
                success: false,
                message: 'You are already part of this group order'
            });
        }

        groupOrder.participants.push({
            user: userId,
            meals: [],
            subtotal: 0,
            hasPaid: false
        });

        await groupOrder.save();

        // Add notification
        const notification = new Notification({
            userId: groupOrder.creator,
            message: `A new member joined your group order: ${groupOrder.title}`
        });
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Successfully joined group order'
        });

    } catch (error) {
        console.error('Join group order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining group order',
            error: error.message
        });
    }
};

// Add meals to group order
const addMealsToGroupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { meals } = req.body;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId);

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        const participant = groupOrder.participants.find(
            p => p.user.toString() === userId.toString()
        );

        if (!participant) {
            return res.status(403).json({
                success: false,
                message: 'You are not part of this group order'
            });
        }

        // Calculate subtotal
        let subtotal = 0;
        for (const mealItem of meals) {
            const meal = await Meal.findById(mealItem.meal);
            if (!meal) {
                return res.status(404).json({
                    success: false,
                    message: `Meal with ID ${mealItem.meal} not found`
                });
            }
            subtotal += meal.price * mealItem.quantity;
        }

        participant.meals = meals;
        participant.subtotal = subtotal;

        // Recalculate total amount
        groupOrder.totalAmount = groupOrder.participants.reduce((total, p) => total + p.subtotal, 0);

        await groupOrder.save();

        res.status(200).json({
            success: true,
            message: 'Meals added to group order successfully',
            data: {
                subtotal,
                totalAmount: groupOrder.totalAmount
            }
        });

    } catch (error) {
        console.error('Add meals to group order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding meals to group order',
            error: error.message
        });
    }
};

// Get public group orders
const getPublicGroupOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, restaurant, university } = req.query;
        const userId = req.user._id;

        const filter = {
            status: 'open',
            isPublic: true,
            orderDeadline: { $gt: new Date() }
        };

        if (restaurant) filter.restaurant = restaurant;

        // Filter by user's university
        if (university) {
            const user = await User.findById(userId);
            if (user && user.university) {
                // Get restaurants from user's university
                const restaurants = await Restaurant.find({ university: user.university });
                const restaurantIds = restaurants.map(r => r._id);
                filter.restaurant = { $in: restaurantIds };
            }
        }

        const skip = (page - 1) * limit;

        const orders = await GroupOrder.find(filter)
            .populate('creator', 'username')
            .populate('restaurant', 'name imageUrl')
            .populate('participants.user', 'username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await GroupOrder.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get public group orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching group orders',
            error: error.message
        });
    }
};

// ===== REFERRAL SYSTEM =====

// Generate referral code
const generateReferralCode = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        // Check if user already has an active referral code
        let existingReferral = await Referral.findOne({
            referrer: userId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (existingReferral) {
            return res.status(200).json({
                success: true,
                data: {
                    referralCode: existingReferral.referralCode,
                    expiresAt: existingReferral.expiresAt,
                    rewardAmount: existingReferral.rewardAmount
                }
            });
        }

        // Generate new referral code
        const referralCode = `${user.username.toUpperCase()}-${generateId().substring(0, 6)}`;

        const referral = new Referral({
            referrer: userId,
            referralCode,
            status: 'pending'
        });

        // Create placeholder for referred user (will be updated when someone uses the code)
        await referral.save();

        res.status(201).json({
            success: true,
            message: 'Referral code generated successfully',
            data: {
                referralCode: referral.referralCode,
                expiresAt: referral.expiresAt,
                rewardAmount: referral.rewardAmount
            }
        });

    } catch (error) {
        console.error('Generate referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating referral code',
            error: error.message
        });
    }
};

// Use referral code during registration
const useReferralCode = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const userId = req.user._id;

        if (!referralCode) {
            return res.status(400).json({
                success: false,
                message: 'Referral code is required'
            });
        }

        const referral = await Referral.findOne({
            referralCode,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired referral code'
            });
        }

        // Check if user is trying to use their own referral code
        if (referral.referrer.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot use your own referral code'
            });
        }

        // Update referral with referred user
        referral.referred = userId;
        await referral.save();

        // Give bonus to new user
        const newUser = await User.findById(userId);
        newUser.byteBalance += referral.bonusAmount;
        await newUser.save();

        // Create notifications
        const newUserNotification = new Notification({
            userId: userId,
            message: `Welcome bonus: ${referral.bonusAmount} bytes added to your account!`
        });
        await newUserNotification.save();

        res.status(200).json({
            success: true,
            message: `Referral code applied! You received ${referral.bonusAmount} bytes`,
            bonusAmount: referral.bonusAmount
        });

    } catch (error) {
        console.error('Use referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying referral code',
            error: error.message
        });
    }
};

// ===== QUICK REORDER =====

// Save order as quick reorder
const saveQuickReorder = async (req, res) => {
    try {
        const { orderId, name } = req.body;
        const userId = req.user._id;

        const order = await Order.findById(orderId).populate('meals.meal');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const quickReorder = new QuickReorder({
            user: userId,
            name: name || `Reorder from ${new Date(order.createdAt).toLocaleDateString()}`,
            originalOrder: orderId,
            meals: order.meals,
            restaurant: order.restaurant,
            totalPrice: order.totalPrice
        });

        await quickReorder.save();

        res.status(201).json({
            success: true,
            message: 'Order saved for quick reorder',
            data: quickReorder
        });

    } catch (error) {
        console.error('Save quick reorder error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving quick reorder',
            error: error.message
        });
    }
};

// Get user's quick reorders
const getUserQuickReorders = async (req, res) => {
    try {
        const userId = req.user._id;

        const quickReorders = await QuickReorder.find({ user: userId, isActive: true })
            .populate('restaurant', 'name imageUrl')
            .populate('meals.meal', 'name price imageUrl')
            .sort({ timesOrdered: -1, lastOrdered: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            data: quickReorders
        });

    } catch (error) {
        console.error('Get quick reorders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching quick reorders',
            error: error.message
        });
    }
};

// Execute quick reorder
const executeQuickReorder = async (req, res) => {
    try {
        const { reorderId } = req.params;
        const { location, phoneNumber, nearestLandmark, note } = req.body;
        const userId = req.user._id;

        const quickReorder = await QuickReorder.findOne({ _id: reorderId, user: userId });

        if (!quickReorder) {
            return res.status(404).json({
                success: false,
                message: 'Quick reorder not found'
            });
        }

        // Create new order
        const newOrder = new Order({
            user: userId,
            meals: quickReorder.meals,
            restaurant: quickReorder.restaurant,
            totalPrice: quickReorder.totalPrice,
            location: location || req.user.location,
            phoneNumber: phoneNumber || req.user.phoneNumber,
            nearestLandmark: nearestLandmark || req.user.nearestLandmark,
            note: note || ''
        });

        await newOrder.save();

        // Update quick reorder stats
        quickReorder.timesOrdered += 1;
        quickReorder.lastOrdered = new Date();
        await quickReorder.save();

        const populatedOrder = await Order.findById(newOrder._id)
            .populate('meals.meal', 'name price')
            .populate('restaurant', 'name');

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: populatedOrder
        });

    } catch (error) {
        console.error('Execute quick reorder error:', error);
        res.status(500).json({
            success: false,
            message: 'Error executing quick reorder',
            error: error.message
        });
    }
};

// ===== HELPER FUNCTIONS =====

// Calculate next execution time for recurring orders
const calculateNextExecution = (currentDate, repeatType, repeatDays = []) => {
    const nextDate = new Date(currentDate);

    switch (repeatType) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            if (repeatDays.length > 0) {
                // Find next occurrence of specified days
                const currentDay = nextDate.getDay();
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const targetDays = repeatDays.map(day => dayNames.indexOf(day.toLowerCase()));
                
                let daysToAdd = 1;
                while (daysToAdd <= 7) {
                    const testDay = (currentDay + daysToAdd) % 7;
                    if (targetDays.includes(testDay)) {
                        break;
                    }
                    daysToAdd++;
                }
                nextDate.setDate(nextDate.getDate() + daysToAdd);
            } else {
                nextDate.setDate(nextDate.getDate() + 7);
            }
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        default:
            break;
    }

    return nextDate;
};

module.exports = {
    // Scheduled Orders
    createScheduledOrder,
    getUserScheduledOrders,
    cancelScheduledOrder,
    
    // Group Orders
    createGroupOrder,
    joinGroupOrder,
    addMealsToGroupOrder,
    getPublicGroupOrders,
    
    // Referral System
    generateReferralCode,
    useReferralCode,
    
    // Quick Reorder
    saveQuickReorder,
    getUserQuickReorders,
    executeQuickReorder
};
