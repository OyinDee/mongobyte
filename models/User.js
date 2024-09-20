// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    orderHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    }],
    byteBalance: {
        type: Number,
        default: 0.0,
    },
    bio: {
        type: String,
        default: "I'm just here to byte, nothing much"
    },
    verificationCode: {
        type: String,
    },
    phoneVerificationCode: {
        type: String,
    },
    resetCode: {
        type: String,
    },
    resetCodeExpires: {
        type: Date,
    },
    imageUrl: {
        type: String,
    },
    superAdmin: {
        type: Boolean,
        default: false
    },
    location: {
        type: String,
        default: ''
    },
    nearestLandmark: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
