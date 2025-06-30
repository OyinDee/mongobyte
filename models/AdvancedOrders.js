const mongoose = require('mongoose');
const generateId = require('../utils/generateID');

// Scheduled Order Model - for pre-orders at specific times
const scheduledOrderSchema = new mongoose.Schema({
    customId: {
        type: String,
        required: true,
        unique: true,
        default: () => generateId(),
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recipient: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        name: {
            type: String,
        },
        phoneNumber: {
            type: String,
        },
        location: {
            type: String,
        },
        nearestLandmark: {
            type: String,
        }
    },
    meals: [{
        meal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Meal',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
        },
    }],
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    scheduledFor: {
        type: Date,
        required: true,
    },
    repeatType: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none'
    },
    repeatDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    endDate: {
        type: Date,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    fee: {
        type: Number,
        default: 600,
    },
    note: {
        type: String,
    },
    status: {
        type: String,
        enum: ['scheduled', 'processing', 'completed', 'cancelled', 'failed'],
        default: 'scheduled',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    executedOrders: [{
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        executedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['success', 'failed']
        }
    }],
    lastExecuted: {
        type: Date,
    },
    nextExecution: {
        type: Date,
    }
}, {
    timestamps: true,
});

// Group Order Model - for collaborative orders
const groupOrderSchema = new mongoose.Schema({
    customId: {
        type: String,
        required: true,
        unique: true,
        default: () => generateId(),
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        meals: [{
            meal: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Meal',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                default: 1,
            },
        }],
        subtotal: {
            type: Number,
            default: 0
        },
        hasPaid: {
            type: Boolean,
            default: false
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    deliveryInfo: {
        location: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        nearestLandmark: {
            type: String,
        }
    },
    orderDeadline: {
        type: Date,
        required: true,
    },
    deliveryTime: {
        type: Date,
    },
    maxParticipants: {
        type: Number,
        default: 10,
        max: 20
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    splitMethod: {
        type: String,
        enum: ['individual', 'equal', 'custom'],
        default: 'individual'
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    deliveryFee: {
        type: Number,
        default: 600,
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'ordered', 'delivered', 'cancelled'],
        default: 'open',
    },
    finalOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    chat: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});

// Referral System Model
const referralSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    referred: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'expired'],
        default: 'pending'
    },
    rewardAmount: {
        type: Number,
        default: 500, // 500 bytes for successful referral
    },
    bonusAmount: {
        type: Number,
        default: 300, // 300 bytes for new user
    },
    completedAt: {
        type: Date,
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    requiredOrders: {
        type: Number,
        default: 1 // Referred user needs to complete 1 order
    },
    completedOrders: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
});

// Quick Reorder Model - for favorite/quick reorder functionality
const quickReorderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
        maxlength: 50
    },
    originalOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    meals: [{
        meal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Meal',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
        },
    }],
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    timesOrdered: {
        type: Number,
        default: 1
    },
    lastOrdered: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
});

// Compound indexes for better performance
scheduledOrderSchema.index({ user: 1, scheduledFor: 1 });
scheduledOrderSchema.index({ status: 1, nextExecution: 1 });
groupOrderSchema.index({ creator: 1, status: 1 });
groupOrderSchema.index({ restaurant: 1, status: 1, isPublic: 1 });
// Note: referralCode already has unique: true which creates an index
referralSchema.index({ referrer: 1, status: 1 });
quickReorderSchema.index({ user: 1, timesOrdered: -1 });

const ScheduledOrder = mongoose.model('ScheduledOrder', scheduledOrderSchema);
const GroupOrder = mongoose.model('GroupOrder', groupOrderSchema);
const Referral = mongoose.model('Referral', referralSchema);
const QuickReorder = mongoose.model('QuickReorder', quickReorderSchema);

module.exports = {
    ScheduledOrder,
    GroupOrder,
    Referral,
    QuickReorder
};
