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
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled', 'Delivered'],
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
}, {
    timestamps: true,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
