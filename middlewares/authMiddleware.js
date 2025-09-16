const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;
const logger = require('../utils/logger');
const Employee = db.Employee; // Import the Employee model

const protect = async (req, res, next) => {
  let token;

  // Check if the request has an authorization header with a Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get the token from the header
      token = req.headers.authorization.split(' ')[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID in the token and attach it to the request object
      // This query now includes the employee data, including the company_id.
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Employee,
          as: 'employee',
          // FIX: Include the company_id in the attributes.
          attributes: ['id', 'user_id', 'company_id', 'joined_at'],
        }],
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next(); // Continue to the next middleware or route handler

    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = protect;
