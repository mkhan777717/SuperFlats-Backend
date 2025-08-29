// middlewares/errorHandler.js

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log the error for internal debugging
    logger.error(err.stack);

    // Set a default status code and message
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    const message = err.message || 'Internal Server Error';

    // Customize error responses for specific types of errors if needed
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            errors: err.errors.map(e => ({ field: e.path, message: e.message })),
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            message: 'Invalid token, please log in again',
        });
    }

    // Send the final error response
    res.status(statusCode).json({
        message: message,
        // In a production environment, you might not want to send the stack trace
        // to the client for security reasons.
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;