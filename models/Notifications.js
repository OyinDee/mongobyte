const mongoose = require('mongoose');
const generateId = require('../utils/generateID');

const notificationSchema = new mongoose.Schema({
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
    message: {
        type: String,
        required: true,
    },
    referenceId: {
        type: String, 
        required: false,
    },
    note: {
        type: String,
        required: false,
    },
    type: {
        type: String,
        enum: ['Order', 'Transfer', 'General'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
