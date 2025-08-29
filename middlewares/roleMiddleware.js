// middlewares/roleMiddleware.js

const logger = require('../utils/logger');

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if the user object was attached by the authMiddleware
        if (!req.user || !req.user.role) {
            logger.warn('Role-based access denied: User or role not found in request.');
            return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
        }

        const { role } = req.user;

        // Check if the user's role is included in the list of allowed roles
        if (allowedRoles.includes(role)) {
            next(); // User has the correct role, proceed to the next handler
        } else {
            logger.warn(`Role-based access denied for user ${req.user.email}. Required roles: [${allowedRoles.join(', ')}], User role: ${role}`);
            res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' });
        }
    };
};

module.exports = authorize;