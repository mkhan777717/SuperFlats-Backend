// controllers/authController.js

const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRegistrationSchema } = require('../utils/validator');
const User = db.User;

// Generate a JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Token expires in 1 hour
  });
};

// Register a new user
exports.register = async (req, res) => {
  try {
    // Validate request body against Joi schema
    const { error } = userRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { username, email, role, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the new user
    const newUser = await User.create({
      username,
      email,
      role,
      password: hashedPassword, // Store the hashed password
    });

    // Generate and send a token
    const token = generateToken(newUser.id);
    
    logger.info(`New user registered: ${newUser.email}`);
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      token,
    });

  } catch (error) {
    logger.error('Error during user registration:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Log in a user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate and send a token
    const token = generateToken(user.id);
    
    logger.info(`User logged in: ${user.email}`);
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
    });

  } catch (error) {
    logger.error('Error during user login:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};