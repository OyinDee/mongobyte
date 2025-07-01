const mongoose = require('mongoose');
const generateId = require('../utils/generateID');

const orderSchema = new mongoose.Schema({
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
    meals: [
        {
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
        }
    ],
    note: {
        type: String,
        required: false,  
    },
    nearestLandmark :{
        type: String, 
    },
    fee: {
        type: Number,
        default: 600,
    },
    foodAmount: {
        type: Number,
        required: false,
    },
    requestedFee:{
        type: Number,
    },
    requestDescription:{
        type: String
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Canceled', 'Fee Requested', 'Delivered'],
        default: 'Pending',
    },
    location: {
        type: String,  
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },

    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    groupOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GroupOrder',
        required: false,
    },
    recipient: {
        name: {
            type: String,
            required: false,
        },
        phone: {
            type: String,
            required: false,
        },
        instructions: {
            type: String,
            required: false,
        }
    },
}, {
    timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
