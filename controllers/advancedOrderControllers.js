const { ScheduledOrder, GroupOrder, QuickReorder } = require('../models/AdvancedOrders');
const Order = require('../models/Orders');
const User = require('../models/User');
const Restaurant = require('../models/Restaurants');
const Meal = require('../models/Meals');
const Notification = require('../models/Notifications');
const generateId = require('../utils/generateID');
const sendEmail = require('../configs/nodemailer');

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

        // Create notification for restaurant
        const restaurantInfo = await Restaurant.findById(restaurant);
        if (restaurantInfo) {
            const restaurantNotification = new Notification({
                restaurantId: restaurant,
                message: `New scheduled order for ${new Date(scheduledFor).toLocaleDateString()}. Order value: ₦${totalPrice}`,
                isRead: false
            });
            await restaurantNotification.save();
        }

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

        // Create notification for restaurant when group order is created
        const restaurantInfo = await Restaurant.findById(restaurant);
        if (restaurantInfo) {
            const restaurantNotification = new Notification({
                restaurantId: restaurant,
                message: `New group order "${title}" created with deadline: ${new Date(orderDeadline).toLocaleDateString()}`,
                isRead: false
            });
            await restaurantNotification.save();
        }

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

// Process payment for group order participant
const processGroupOrderPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId)
            .populate('participants.user', 'username byteBalance')
            .populate('participants.meals.meal', 'name price')
            .populate('restaurant', 'name');

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is a participant
        const participantIndex = groupOrder.participants.findIndex(
            p => p.user._id.toString() === userId.toString()
        );

        if (participantIndex === -1) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this group order'
            });
        }

        const participant = groupOrder.participants[participantIndex];

        // Check if already paid
        if (participant.hasPaid) {
            return res.status(400).json({
                success: false,
                message: 'You have already paid for this order'
            });
        }

        // Check if order is still open
        if (groupOrder.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'This group order is no longer accepting payments'
            });
        }

        // Check if user has sufficient balance
        const user = await User.findById(userId);
        if (user.byteBalance < participant.subtotal) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. You need ${participant.subtotal} bytes but have ${user.byteBalance} bytes.`
            });
        }

        // Deduct money from user
        user.byteBalance -= participant.subtotal;
        await user.save();

        // Mark participant as paid
        groupOrder.participants[participantIndex].hasPaid = true;
        await groupOrder.save();

        // Send payment confirmation email to user
        if (user.email) {
            const paymentEmailHtml = `
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #FFCC00; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .highlight, .success-box, .alert-box, .fee-info, .bonus-info, .reward-info, .update-info, .order-info { background-color: #FFCC00; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Payment Confirmed! ✅</h1>
    </div>
    <div class="content">
      <p>Hi ${user.username}! 👋</p>
      <p>Great news! Your payment for the group order has been processed successfully.</p>
      <div class="payment-info">
        <p><strong>🍽️ Group Order:</strong> ${groupOrder.title}</p>
        <p><strong>🏪 Restaurant:</strong> ${groupOrder.restaurant.name}</p>
        <p><strong>💰 Amount Paid:</strong> ₦${participant.subtotal.toFixed(2)}</p>
        <p><strong>💳 Your New Balance:</strong> ₦${user.byteBalance.toFixed(2)}</p>
      </div>
      <p>We're waiting for all participants to complete their payments before sending the order to the restaurant. You'll be notified once everyone has paid! 🎉</p>
      <p>Thank you for choosing Byte for your group dining experience! 🍕</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Making group orders delicious! 😋</p>
    </div>
  </div>
</body>
</html>
            `;
            
            setImmediate(async () => {
                try {
                    await sendEmail(user.email, 'Group Order Payment Confirmed', 'Your payment has been processed successfully.', paymentEmailHtml);
                } catch (emailError) {
                    console.error('Error sending payment confirmation email:', emailError);
                }
            });
        }

        // Check if all participants have paid
        const allParticipantsPaid = groupOrder.participants.every(p => p.hasPaid);

        if (allParticipantsPaid) {
            // Update group order status to ready for restaurant review
            groupOrder.status = 'ready';
            await groupOrder.save();

            // Notify restaurant about the completed group order
            const restaurantNotification = new Notification({
                restaurantId: groupOrder.restaurant._id,
                message: `New group order "${groupOrder.title}" is ready for review. All participants have paid.`,
                isRead: false,
                type: 'group_order'
            });
            await restaurantNotification.save();

            // Notify all participants that the order is complete
            const participantNotifications = groupOrder.participants.map(p => new Notification({
                userId: p.user._id,
                message: `All participants have paid for "${groupOrder.title}". The order has been sent to the restaurant for preparation.`,
                isRead: false,
                type: 'group_order'
            }));
            await Notification.insertMany(participantNotifications);

            // Send email notifications to all participants
            setImmediate(async () => {
                try {
                    // Get all participant details for emails
                    const participantUsers = await User.find({
                        '_id': { $in: groupOrder.participants.map(p => p.user._id) }
                    });

                    for (const participantUser of participantUsers) {
                        if (participantUser.email) {
                            const allPaidEmailHtml = `
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #FFCC00; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .content p { margin: 15px 0; }
    .order-info { background-color: #FFCC00; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Order Sent to Restaurant! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi ${participantUser.username}! 👋</p>
      <p>Fantastic news! All participants in your group order have completed their payments, and the order has been sent to the restaurant for preparation.</p>
      <div class="order-info">
        <p><strong>🍽️ Group Order:</strong> ${groupOrder.title}</p>
        <p><strong>🏪 Restaurant:</strong> ${groupOrder.restaurant.name}</p>
        <p><strong>👥 Total Participants:</strong> ${groupOrder.participants.length}</p>
        <p><strong>📅 Delivery Time:</strong> ${new Date(groupOrder.deliveryTime).toLocaleString()}</p>
      </div>
      <p>The restaurant will now review and accept your order. You'll receive another notification once they confirm it! 🍕</p>
      <p>Thank you for using Byte for your group dining experience! 😋</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Companion</p>
      <p>Bringing groups together, one bite at a time! 🍽️</p>
    </div>
  </div>
</body>
</html>
                            `;
                            
                            await sendEmail(
                                participantUser.email, 
                                'Group Order Sent to Restaurant!', 
                                'All participants have paid - order sent to restaurant.', 
                                allPaidEmailHtml
                            );
                        }
                    }

                    // Send email to restaurant
                    const restaurant = await Restaurant.findById(groupOrder.restaurant._id);
                    if (restaurant && restaurant.email) {
                        const restaurantEmailHtml = `
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff; color: #000; margin: 0; padding: 0; }
    .container, .email-container { width: 90%; max-width: 600px; margin: 30px auto; background-color: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .header { text-align: center; padding: 40px 20px 30px; background-color: #990000; color: #fff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .brand-text, .brand { color: #FFCC00; font-weight: bold; }
    .content { font-size: 16px; line-height: 1.6; padding: 30px; color: #000; background-color: #fff; }
    .order-info { background-color: #FFCC00; color: #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-weight: bold; }
    .footer { background-color: #000; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>New Group Order Ready! 🍽️</h1>
    </div>
    <div class="content">
      <p>Hi ${restaurant.name}! 👋</p>
      <p>You have received a new group order where all participants have completed their payments and the order is ready for your review.</p>
      <div class="order-info">
        <p><strong>🍽️ Group Order:</strong> ${groupOrder.title}</p>
        <p><strong>👥 Total Participants:</strong> ${groupOrder.participants.length}</p>
        <p><strong>📅 Requested Delivery Time:</strong> ${new Date(groupOrder.deliveryTime).toLocaleString()}</p>
        <p><strong>💰 Total Order Value:</strong> ₦${groupOrder.participants.reduce((total, p) => total + p.subtotal, 0).toFixed(2)}</p>
      </div>
      <p>Please log into your dashboard to review the order details and accept or decline the order. All payments have been processed and are ready for transfer upon acceptance! 💰</p>
      <p>Thank you for being part of the Byte platform! 🙏</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Partner</p>
      <p>Growing your business, one order at a time! 📈</p>
    </div>
  </div>
</body>
</html>
                        `;
                        
                        await sendEmail(
                            restaurant.email, 
                            'New Group Order - All Payments Complete', 
                            'A new group order is ready for your review.', 
                            restaurantEmailHtml
                        );
                    }
                } catch (emailError) {
                    console.error('Error sending group order completion emails:', emailError);
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                amountPaid: participant.subtotal,
                newBalance: user.byteBalance,
                allPaid: allParticipantsPaid,
                orderStatus: groupOrder.status
            }
        });

    } catch (error) {
        console.error('Process group order payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment',
            error: error.message
        });
    }
};

// Get group order payment status
const getGroupOrderPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId)
            .populate('participants.user', 'username')
            .select('participants status totalAmount deliveryFee');

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is a participant
        const participant = groupOrder.participants.find(
            p => p.user._id.toString() === userId.toString()
        );

        if (!participant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this group order'
            });
        }

        // Calculate payment summary
        const totalParticipants = groupOrder.participants.length;
        const paidParticipants = groupOrder.participants.filter(p => p.hasPaid).length;
        const unpaidParticipants = groupOrder.participants.filter(p => !p.hasPaid);

        res.status(200).json({
            success: true,
            data: {
                yourPayment: {
                    amount: participant.subtotal,
                    hasPaid: participant.hasPaid
                },
                groupSummary: {
                    totalParticipants,
                    paidParticipants,
                    unpaidParticipants: unpaidParticipants.map(p => ({
                        username: p.user.username,
                        amount: p.subtotal
                    })),
                    orderStatus: groupOrder.status,
                    allPaid: paidParticipants === totalParticipants
                }
            }
        });

    } catch (error) {
        console.error('Get group order payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment status',
            error: error.message
        });
    }
};

// Refund group order (if order is cancelled before completion)
const refundGroupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId)
            .populate('participants.user', 'username byteBalance');

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Only creator can trigger refunds or restaurant/admin
        if (groupOrder.creator.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the group order creator can process refunds'
            });
        }

        if (groupOrder.status !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Can only refund cancelled orders'
            });
        }

        // Process refunds for all participants who paid
        const refundPromises = groupOrder.participants
            .filter(p => p.hasPaid)
            .map(async (participant) => {
                const user = await User.findById(participant.user._id);
                user.byteBalance += participant.subtotal;
                await user.save();

                // Create refund notification
                const notification = new Notification({
                    userId: participant.user._id,
                    message: `Refund processed: ${participant.subtotal} bytes returned for cancelled group order.`,
                    isRead: false,
                    type: 'refund'
                });
                await notification.save();

                return {
                    userId: participant.user._id,
                    amount: participant.subtotal
                };
            });

        const refunds = await Promise.all(refundPromises);

        // Mark all participants as not paid
        groupOrder.participants.forEach(p => p.hasPaid = false);
        await groupOrder.save();

        res.status(200).json({
            success: true,
            message: 'Refunds processed successfully',
            data: {
                refundsProcessed: refunds.length,
                totalRefunded: refunds.reduce((sum, r) => sum + r.amount, 0),
                refunds: refunds
            }
        });

    } catch (error) {
        console.error('Refund group order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing refunds',
            error: error.message
        });
    }
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
    
    // Quick Reorder
    saveQuickReorder,
    getUserQuickReorders,
    executeQuickReorder,

    // Payment Processing
    processGroupOrderPayment,
    getGroupOrderPaymentStatus,
    refundGroupOrder
};


