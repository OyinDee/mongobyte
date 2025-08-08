const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const generateId = require('../utils/generateID');

/*
 * SECURITY WARNING: This model contains sensitive fields that should NOT be exposed in API responses:
 * - password: Hashed password for restaurant authentication
 * - bankName, accountNumber, accountHolder: Banking information for payments
 * - walletBalance: Current wallet balance
 * - verificationCode: Used for account verification
 * 
 * Always use .select() to exclude these fields when fetching restaurants for client responses:
 * .select('-password -bankName -accountNumber -accountHolder -walletBalance -verificationCode')
 * 
 * SAFE FIELDS that can be exposed in API responses:
 * - customId: Restaurant's unique identifier (required for frontend routing)
 * - name, location, imageUrl: Public restaurant information
 * - university, isActive: Business logic fields
 * - averageRating, totalRatings: Public rating information
 * - description, contactNumber: Public business information
 */

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
    university: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
        required: true,
    },
    bankName: {
        type: String,
    },
    accountNumber: {
        type: String,
    },
    accountHolder: {
        type: String,
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
    isActive: { 
        type: Boolean,
        default: true,
    },
    nearestLandmarks: [{
        type: String
    }],
    // Rating System Fields
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    ratingsBreakdown: {
        fiveStars: { type: Number, default: 0 },
        fourStars: { type: Number, default: 0 },
        threeStars: { type: Number, default: 0 },
        twoStars: { type: Number, default: 0 },
        oneStar: { type: Number, default: 0 }
    },
    lastRatingUpdate: {
        type: Date,
        default: Date.now
    }
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
