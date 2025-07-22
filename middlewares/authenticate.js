const jwt = require('jsonwebtoken');

const authenticate = async (request, response, next) => {

    const token = request.headers['authorization']?.split(' ')[1]; 

    if (!token) {
        return response.status(401).json({ message: 'No token provided' });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.user && decoded.user.superAdmin) {
            request.user = decoded.user;
            return next();
        }

        return response.status(403).json({ message: 'Access denied. Only super admins can perform this action.' });

    } catch (error) {
        console.error(error);
         response.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticate;
