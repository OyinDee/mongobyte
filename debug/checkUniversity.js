const User = require('../models/User');
const University = require('../models/University');
const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserUniversity() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const userId = '671ca3aadac9c39e815fa7c2';
        
        // Check raw user data
        const user = await User.findById(userId);
        
        // Check with population
        const userWithUniversity = await User.findById(userId).populate('university', 'name _id');
        
        // Check if university exists
        if (user.university) {
            const university = await University.findById(user.university);
        }
        
        mongoose.disconnect();
    } catch (error) {
        // Remove all console.log, console.error, etc. from this file
    }
}

checkUserUniversity();
