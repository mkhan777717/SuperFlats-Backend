const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRegistrationSchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');
const User = db.User;

// Generate a JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Register a new user
exports.register = async (req, res) => {
    try {
        // Validate request body against Joi schema that uses 'name'
        const { error } = userRegistrationSchema.validate(req.body);
        if (error) {
            logger.warn(`Validation failed during registration: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        const { name, email, role, password } = req.body;

        // Check if a user with the same email already exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            logger.warn(`Registration failed: User with email '${email}' already exists.`);
            return res.status(409).json({ message: `A user with this email already exists.` });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new user
        const newUser = await User.create({
            name,
            email,
            role,
            password: hashedPassword,
        });

        // Generate and send a token
        const token = generateToken(newUser.id);

        logger.info(`New user registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            token,
        });

    } catch (error) {
        // Catch-all for any other errors (e.g., database connection issues)
        logger.error(`Error during user registration for email ${req.body.email}:`, error);
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
            logger.warn(`Login failed for email ${email}: User not found.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Login failed for email ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Generate and send a token
        const token = generateToken(user.id);

        logger.info(`User logged in successfully: ${user.email}`);
        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during user login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

