const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    state: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    nearestLandmarks: [{
        type: String
    }],
    restaurants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
    }]
}, {
    timestamps: true
});

const University = mongoose.model('University', universitySchema);

module.exports = University;
