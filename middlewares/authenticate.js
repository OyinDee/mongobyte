const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (request, response, next) => {
    const token = request.headers['authorization']?.split(' ')[1]; 

    if (!token) {
        return response.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Handle new token structure
        if (decoded.type === 'user' && decoded.userId) {
            const user = await User.findById(decoded.userId);
            if (!user) {
                return response.status(404).json({ message: 'User not found' });
            }
            if (!user.superAdmin) {
                return response.status(403).json({ message: 'Access denied. Only super admins can perform this action.' });
            }
            request.user = user;
            return next();
        }

        // Fallback for old token structure (backward compatibility)
        if (decoded.user && decoded.user.superAdmin) {
            const user = await User.findById(decoded.user._id);
            if (!user || !user.superAdmin) {
                return response.status(403).json({ message: 'Access denied. Only super admins can perform this action.' });
            }
            request.user = user;
            return next();
        }

        return response.status(403).json({ message: 'Access denied. Only super admins can perform this action.' });

    } catch (error) {
        console.error('Super admin authentication error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return response.status(401).json({ message: 'Token expired' });
        }
        response.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
