const cron = require('node-cron');
const { ScheduledOrder, GroupOrder, Referral } = require('../models/AdvancedOrders');
const Order = require('../models/Orders');
const User = require('../models/User');
const Notification = require('../models/Notifications');

// Check and process scheduled orders every minute
const processScheduledOrders = async () => {
    try {
        const now = new Date();
        
        // Find orders that need to be executed
        const ordersToExecute = await ScheduledOrder.find({
            status: 'active',
            isActive: true,
            nextExecution: { $lte: now }
        }).populate('user restaurant meals.meal');

        for (const scheduledOrder of ordersToExecute) {
            try {
                // Create the actual order
                const newOrder = new Order({
                    user: scheduledOrder.user._id,
                    meals: scheduledOrder.meals,
                    restaurant: scheduledOrder.restaurant._id,
                    totalPrice: scheduledOrder.totalPrice,
                    location: scheduledOrder.user.location,
                    phoneNumber: scheduledOrder.user.phoneNumber,
                    nearestLandmark: scheduledOrder.user.nearestLandmark,
                    note: scheduledOrder.note || `Scheduled order: ${scheduledOrder._id}`,
                    ...(scheduledOrder.recipient && scheduledOrder.recipient.name && {
                        recipient: scheduledOrder.recipient
                    })
                });

                await newOrder.save();

                // Update scheduled order
                scheduledOrder.executedOrders.push(newOrder._id);
                scheduledOrder.lastExecuted = now;

                // Calculate next execution for recurring orders
                if (scheduledOrder.repeatType !== 'none') {
                    const nextExecution = calculateNextExecution(
                        now, 
                        scheduledOrder.repeatType, 
                        scheduledOrder.repeatDays
                    );

                    // Check if we've reached the end date
                    if (scheduledOrder.endDate && nextExecution > scheduledOrder.endDate) {
                        scheduledOrder.status = 'completed';
                        scheduledOrder.isActive = false;
                    } else {
                        scheduledOrder.nextExecution = nextExecution;
                    }
                } else {
                    // One-time order, mark as completed
                    scheduledOrder.status = 'completed';
                    scheduledOrder.isActive = false;
                }

                await scheduledOrder.save();

                // Send notification to user
                const notification = new Notification({
                    userId: scheduledOrder.user._id,
                    message: `Your scheduled order has been placed successfully! Order ID: ${newOrder._id}`
                });
                await notification.save();

                console.log(`Scheduled order ${scheduledOrder._id} executed successfully`);

            } catch (error) {
                console.error(`Error executing scheduled order ${scheduledOrder._id}:`, error);
                
                // Mark order as failed
                scheduledOrder.status = 'failed';
                await scheduledOrder.save();

                // Notify user of failure
                const notification = new Notification({
                    userId: scheduledOrder.user._id,
                    message: `Failed to process your scheduled order. Please check your account and try again.`
                });
                await notification.save();
            }
        }

    } catch (error) {
        console.error('Error processing scheduled orders:', error);
    }
};

// Process group order deadlines
const processGroupOrderDeadlines = async () => {
    try {
        const now = new Date();
        
        // Find group orders that have reached their deadline
        const expiredGroupOrders = await GroupOrder.find({
            status: 'open',
            orderDeadline: { $lte: now }
        }).populate('participants.user restaurant');

        for (const groupOrder of expiredGroupOrders) {
            try {
                // Check if minimum order amount is met
                if (groupOrder.totalAmount >= groupOrder.minOrderAmount) {
                    // Process the group order
                    groupOrder.status = 'confirmed';
                    
                    // Create individual orders for each participant with meals
                    for (const participant of groupOrder.participants) {
                        if (participant.meals.length > 0) {
                            const individualOrder = new Order({
                                user: participant.user._id,
                                meals: participant.meals,
                                restaurant: groupOrder.restaurant._id,
                                totalPrice: participant.subtotal,
                                location: groupOrder.deliveryInfo.address,
                                nearestLandmark: groupOrder.deliveryInfo.landmark,
                                note: `Group Order: ${groupOrder.title} - ${groupOrder.deliveryInfo.instructions || ''}`,
                                groupOrderId: groupOrder._id
                            });

                            await individualOrder.save();
                            participant.orderId = individualOrder._id;

                            // Notify participant
                            const notification = new Notification({
                                userId: participant.user._id,
                                message: `Your group order "${groupOrder.title}" has been confirmed and processed!`
                            });
                            await notification.save();
                        }
                    }
                } else {
                    // Cancel group order due to insufficient amount
                    groupOrder.status = 'cancelled';
                    
                    // Notify all participants
                    for (const participant of groupOrder.participants) {
                        const notification = new Notification({
                            userId: participant.user._id,
                            message: `Group order "${groupOrder.title}" was cancelled due to insufficient minimum amount.`
                        });
                        await notification.save();
                    }
                }

                await groupOrder.save();

            } catch (error) {
                console.error(`Error processing group order ${groupOrder._id}:`, error);
            }
        }

    } catch (error) {
        console.error('Error processing group order deadlines:', error);
    }
};

// Process referral rewards
const processReferralRewards = async () => {
    try {
        // Find referrals where the referred user has made their first order
        const pendingReferrals = await Referral.find({
            status: 'pending',
            referred: { $exists: true }
        }).populate('referrer referred');

        for (const referral of pendingReferrals) {
            try {
                // Check if referred user has made an order
                const referredUserOrders = await Order.countDocuments({
                    user: referral.referred._id,
                    status: 'completed'
                });

                if (referredUserOrders > 0) {
                    // Give reward to referrer
                    const referrer = await User.findById(referral.referrer._id);
                    referrer.byteBalance += referral.rewardAmount;
                    await referrer.save();

                    // Update referral status
                    referral.status = 'completed';
                    referral.rewardedAt = new Date();
                    await referral.save();

                    // Notify referrer
                    const notification = new Notification({
                        userId: referral.referrer._id,
                        message: `Congratulations! You earned ${referral.rewardAmount} bytes for referring ${referral.referred.username}!`
                    });
                    await notification.save();

                    console.log(`Referral reward processed for user ${referral.referrer._id}`);
                }

            } catch (error) {
                console.error(`Error processing referral ${referral._id}:`, error);
            }
        }

    } catch (error) {
        console.error('Error processing referral rewards:', error);
    }
};

// Helper function to calculate next execution time
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

// Initialize cron jobs
const initializeScheduler = () => {
    // Run every minute to check for scheduled orders
    cron.schedule('* * * * *', processScheduledOrders);
    
    // Run every 5 minutes to check group order deadlines
    cron.schedule('*/5 * * * *', processGroupOrderDeadlines);
    
    // Run every hour to process referral rewards
    cron.schedule('0 * * * *', processReferralRewards);
    
    console.log('Scheduler initialized for advanced orders');
};

module.exports = {
    initializeScheduler,
    processScheduledOrders,
    processGroupOrderDeadlines,
    processReferralRewards
};
