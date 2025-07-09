const Withdrawal = require('../models/Withdrawals');
const Restaurant = require('../models/Restaurants');

// List all withdrawals
exports.listWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find();
        res.status(200).json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get a single withdrawal by ID
exports.getWithdrawal = async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }
        res.status(200).json(withdrawal);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get withdrawals for a specific restaurant
exports.getRestaurantWithdrawals = async (req, res) => {
    try {
        const { customId } = req.params;
        
        // Find restaurant by customId or ObjectId
        let restaurant = null;
        if (customId.match(/^[0-9a-fA-F]{24}$/)) {
            restaurant = await Restaurant.findById(customId);
        }
        if (!restaurant) {
            restaurant = await Restaurant.findOne({ customId: customId });
        }
        
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        
        // Find withdrawals for this restaurant
        const withdrawals = await Withdrawal.find({ restaurantName: restaurant.name })
            .sort({ createdAt: -1 });
            
        res.status(200).json(withdrawals);
    } catch (error) {
        console.error('Error fetching restaurant withdrawals:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Update withdrawal status
exports.updateWithdrawalStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const withdrawal = await Withdrawal.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }
        res.status(200).json({ message: 'Withdrawal status updated', withdrawal });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};