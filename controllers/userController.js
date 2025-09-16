const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { uploadFile, deleteFile } = require('../utils/fileService');
const User = db.User;
const Employee = db.Employee;


// Get authenticated user's profile information

exports.getProfile = async (req, res) => {
    try {
        // Find the user and conditionally include the Employee model
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{
                model: Employee,
                as: 'employee',
                attributes: ['company_id'],
                required: false // Use LEFT JOIN to not fail for clients
            }],
        });

        if (!user) {
            logger.warn(`Profile request failed for user ${req.user.id}: User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // Extract company_id if the employee record exists
        const companyId = user.employee ? user.employee.company_id : null;

        logger.info(`Profile data retrieved successfully for user ${req.user.id}.`);
        res.status(200).json({
            ...user.toJSON(),
            company_id: companyId
        });

    } catch (error) {
        logger.error(`Error fetching user profile for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Update user's name and email
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone_number } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            logger.warn(`Profile update failed for user ${req.user.id}: User not found.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) {
                logger.warn(`Profile update failed for user ${req.user.id}: Email '${email}' is already in use.`);
                return res.status(409).json({ message: 'This email is already in use.' });
            }
        }

        if (phone_number && phone_number !== user.phone_number) {
            const phoneNumberExists = await User.findOne({ where: { phone_number } });
            if (phoneNumberExists) {
                logger.warn(`Profile update failed for user ${req.user.id}: Phone number '${phone_number}' is already in use.`);
                return res.status(409).json({ message: 'This phone number is already in use.' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.phone_number = phone_number || user.phone_number;

        await user.save();

        logger.info(`User profile updated for user ${user.id}.`);
        res.status(200).json({
            message: 'Profile updated successfully.', user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                role: user.role,
            }
        });

    } catch (error) {
        logger.error(`Error updating profile for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Update user's password
exports.updatePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Both oldPassword and newPassword are required.' });
        }

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

        if (user.profile_image) {
            await deleteFile(user.profile_image, 'profile image');
        }

        imageUrl = await uploadFile(req.file);

        user.profile_image = imageUrl;
        await user.save();

        logger.info(`User ${user.id} profile image uploaded successfully: ${imageUrl}`);
        res.status(200).json({
            message: 'Profile image uploaded successfully.',
            imageUrl,
        });

    } catch (error) {
        if (imageUrl) {
            await deleteFile(imageUrl, 'partially uploaded image');
        }
        logger.error(`Error uploading profile image for user ${req.user.id}:`, error);
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

        if (!user.profile_image) {
            return res.status(400).json({ message: 'No profile image to remove.' });
        }

        await deleteFile(user.profile_image, 'profile image');

        user.profile_image = null;
        await user.save();

        logger.info(`Profile image removed successfully for user ${user.id}.`);
        res.status(200).json({ message: 'Profile image removed successfully.' });

    } catch (error) {
        logger.error(`Error removing profile image for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};