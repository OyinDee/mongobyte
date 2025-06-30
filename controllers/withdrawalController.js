const Withdrawal = require('../models/Withdrawals');

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