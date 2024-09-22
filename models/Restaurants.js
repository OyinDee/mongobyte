const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const generateId = require('../utils/generateID');

const restaurantSchema = new mongoose.Schema({
    customId: {
        type: String,
        required: true,
        unique: true,
        default: () => generateId(),
    },
    name: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
    },
    location: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
    },
    imageUrl: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    walletBalance: {
        type: Number,
        required: true,
        default: 0,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        type: String,
        default: null,
    },
    meals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal',
    }],
    notifications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification',
    }],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    }],
}, {
    timestamps: true,
});

restaurantSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

restaurantSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
