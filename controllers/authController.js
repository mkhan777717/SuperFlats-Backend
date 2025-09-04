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

// Get authenticated user's profile information
exports.getProfile = async (req, res) => {
    try {
        // The authMiddleware has already attached the user object to the request
        // We use req.user.id to find the user's data
        const user = await User.findByPk(req.user.id, {
            // Exclude the sensitive password hash from the response
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            logger.warn(`Profile request failed for user ${req.user.id}: User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        logger.info(`Profile data retrieved successfully for user ${req.user.id}.`);
        res.status(200).json(user);

    } catch (error) {
        logger.error(`Error fetching user profile for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Update user's name and email
exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            logger.warn(`Profile update failed for user ${req.user.id}: User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the new email already exists and belongs to a different user
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) {
                logger.warn(`Profile update failed for user ${req.user.id}: Email '${email}' is already in use.`);
                return res.status(409).json({ message: 'This email is already in use.' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;

        await user.save();

        logger.info(`User profile updated for user ${user.id}.`);
        res.status(200).json({
            message: 'Profile updated successfully.', user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        });

    } catch (error) {
        logger.error(`Error updating profile for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Remove a user's profile image
exports.removeProfileImage = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if a profile image URL exists
        if (!user.profile_image) {
            return res.status(400).json({ message: 'No profile image to remove.' });
        }

        // Delete the image file from storage
        await deleteFile(user.profile_image, 'profile image');

        // Remove the URL from the database
        user.profile_image = null;
        await user.save();

        logger.info(`Profile image removed successfully for user ${user.id}.`);
        res.status(200).json({ message: 'Profile image removed successfully.' });

    } catch (error) {
        logger.error(`Error removing profile image for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
exports.updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // User ID from the authenticated token

    try {
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Both oldPassword and newPassword are required.' });
        }

        // Use the correct Sequelize method: findByPk
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid old password.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        logger.info(`Password updated successfully for user ${userId}.`);
        res.json({ message: 'Password updated successfully.' });

    } catch (err) {
        logger.error(`Error updating password for user ${userId}:`, err);
        res.status(500).json({ error: 'Server Error' });
    }
};
