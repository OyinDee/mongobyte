const { GroupOrder } = require('../models/AdvancedOrders');
const User = require('../models/User');

// Add chat message to group order
const addChatMessage = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { message } = req.body;
        const userId = req.user._id;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        const groupOrder = await GroupOrder.findById(orderId);

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is a participant
        const isParticipant = groupOrder.participants.some(
            p => p.user.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this group order'
            });
        }

        // Add message to chat
        groupOrder.chat.push({
            user: userId,
            message: message.trim(),
            timestamp: new Date()
        });

        await groupOrder.save();

        // Populate the user info for the response
        const populatedGroupOrder = await GroupOrder.findById(orderId)
            .populate('chat.user', 'username')
            .select('chat');

        const newMessage = populatedGroupOrder.chat[populatedGroupOrder.chat.length - 1];

        res.status(201).json({
            success: true,
            message: 'Message added successfully',
            data: newMessage
        });

    } catch (error) {
        console.error('Add chat message error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding chat message',
            error: error.message
        });
    }
};

// Get group order chat
const getGroupOrderChat = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId);

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is a participant
        const isParticipant = groupOrder.participants.some(
            p => p.user.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this group order'
            });
        }

        // Get paginated chat messages
        const skip = (page - 1) * limit;
        const totalMessages = groupOrder.chat.length;
        
        // Get messages in reverse order (newest first), then reverse again for chronological order
        const messages = groupOrder.chat
            .slice(-skip - parseInt(limit), totalMessages - skip)
            .reverse();

        // Populate user information
        const populatedGroupOrder = await GroupOrder.findById(orderId)
            .populate('chat.user', 'username')
            .select('chat');

        const populatedMessages = messages.map(msg => {
            const populatedMsg = populatedGroupOrder.chat.find(
                pm => pm._id.toString() === msg._id.toString()
            );
            return populatedMsg || msg;
        });

        res.status(200).json({
            success: true,
            data: populatedMessages,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalMessages / limit),
                totalMessages,
                messagesPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get group order chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching chat messages',
            error: error.message
        });
    }
};

// Get group order details
const getGroupOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId)
            .populate('creator', 'username')
            .populate('restaurant', 'name imageUrl')
            .populate('participants.user', 'username')
            .populate('participants.meals.meal', 'name price imageUrl');

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is a participant or if it's a public order
        const isParticipant = groupOrder.participants.some(
            p => p.user._id.toString() === userId.toString()
        );

        if (!isParticipant && !groupOrder.isPublic) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: groupOrder
        });

    } catch (error) {
        console.error('Get group order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching group order details',
            error: error.message
        });
    }
};

// Leave group order
const leaveGroupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId);

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is the creator
        if (groupOrder.creator.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Creator cannot leave the group order. Cancel the order instead.'
            });
        }

        // Remove participant
        const participantIndex = groupOrder.participants.findIndex(
            p => p.user.toString() === userId.toString()
        );

        if (participantIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'You are not a participant in this group order'
            });
        }

        groupOrder.participants.splice(participantIndex, 1);

        // Recalculate total amount
        groupOrder.totalAmount = groupOrder.participants.reduce((total, p) => total + p.subtotal, 0);

        await groupOrder.save();

        res.status(200).json({
            success: true,
            message: 'Successfully left the group order'
        });

    } catch (error) {
        console.error('Leave group order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error leaving group order',
            error: error.message
        });
    }
};

// Cancel group order (creator only)
const cancelGroupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const groupOrder = await GroupOrder.findById(orderId);

        if (!groupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Group order not found'
            });
        }

        // Check if user is the creator
        if (groupOrder.creator.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the creator can cancel the group order'
            });
        }

        if (groupOrder.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a group order that is not open'
            });
        }

        groupOrder.status = 'cancelled';
        await groupOrder.save();

        res.status(200).json({
            success: true,
            message: 'Group order cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel group order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling group order',
            error: error.message
        });
    }
};

module.exports = {
    addChatMessage,
    getGroupOrderChat,
    getGroupOrderDetails,
    leaveGroupOrder,
    cancelGroupOrder
};
