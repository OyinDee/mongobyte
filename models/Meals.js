const mongoose = require('mongoose');
const generateId = require('../utils/generateID');

const mealSchema = new mongoose.Schema({
    customId: {
        type: String,
        required: true,
        unique: true,
        default: () => generateId(),
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    tag:{
        type: String,
    },
    per:{
        type: String,
    },
    price: {
        type: Number,
        required: true,
    },
    availability: {
        type: Boolean,
        default: true,
    },
    imageUrl: {
        type: String,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, {
    timestamps: true,
});

const Meal = mongoose.model('Meal', mealSchema);

module.exports = Meal;
