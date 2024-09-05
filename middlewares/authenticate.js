const jwt = require('jsonwebtoken');

const checkSuperAdmin = (request, response, next) => {
    const token = request.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
        return response.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Check if user is a super admin
        if (!decoded.user.superAdmin) {

            return response.status(403).json({ message: 'Access denied. Only super admins can perform this action.' });
        }

        // Attach decoded user information to request object for further use
        request.user = decoded;

        next();
    } catch (error) {
        console.error(error);
        response.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = checkSuperAdmin;
