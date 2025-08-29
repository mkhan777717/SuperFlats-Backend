// controllers/authController.js

const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRegistrationSchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService'); // Also import deleteFile
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
            logger.warn(`Validation failed during registration: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        const { username, email, role, password } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            logger.warn(`Registration failed: User with email ${email} already exists.`);
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
            password: hashedPassword,
        });

        // Generate and send a token
        const token = generateToken(newUser.id);

        logger.info(`New user registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            token,
        });

    } catch (error) {
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
            username: user.username,
            email: user.email,
            role: user.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during user login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Upload a profile image for an authenticated user
exports.uploadProfileImage = async (req, res) => {
    let imageUrl = null;
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            logger.warn(`Profile image upload failed for user ${req.user.id}: User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        if (!req.file) {
            logger.warn(`Profile image upload failed for user ${req.user.id}: No file uploaded.`);
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // If the user already has a profile image, delete the old one
        if (user.profile_image) {
            await deleteFile(user.profile_image, 'profile image');
        }

        // Upload the new image
        imageUrl = await uploadFile(req.file);

        // Update the user's profile_image URL in the database
        user.profile_image = imageUrl;
        await user.save();

        logger.info(`User ${user.id} profile image uploaded successfully: ${imageUrl}`);
        res.status(200).json({
            message: 'Profile image uploaded successfully.',
            imageUrl,
        });

    } catch (error) {
        // If upload to Firebase fails, ensure we don't save a broken URL
        if (imageUrl) {
            await deleteFile(imageUrl, 'partially uploaded image');
        }
        logger.error(`Error uploading profile image for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};