const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRegistrationSchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');
const User = db.User;

// Generate a JWT token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Register a new user with a hardcoded 'admin' role
exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const role = 'admin';

        // Check if a user with the same email already exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            logger.warn(`Admin registration failed: User with email '${email}' already exists.`);
            return res.status(409).json({ message: `A user with this email already exists.` });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new admin user
        const newUser = await User.create({
            name,
            email,
            role,
            password: hashedPassword,
        });

        // Generate and send a token
        const token = generateToken(newUser.id, newUser.role);

        logger.info(`New admin registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during admin registration for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Register a new user with a hardcoded 'client' role
exports.registerClient = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const role = 'client';

        // Check if a user with the same email already exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            logger.warn(`Client registration failed: User with email '${email}' already exists.`);
            return res.status(409).json({ message: `A user with this email already exists.` });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new client user
        const newUser = await User.create({
            name,
            email,
            role,
            password: hashedPassword,
        });

        // Generate and send a token
        const token = generateToken(newUser.id, newUser.role);

        logger.info(`New client registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during client registration for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Log in an admin user
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            logger.warn(`Admin/agent login failed for email ${email}: User not found.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Check if the user has the 'admin' role
        if (user.role !== 'admin' && user.role !== 'agent') {
            logger.warn(` login failed: User ${email} is not an admin or agent.`);
            return res.status(403).json({ message: 'You do not have permission to log in here.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Admin login failed for email ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = generateToken(user.id, user.role);

        logger.info(`Admin/agent logged in successfully: ${user.email}`);
        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during admin/agent login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Log in a client user
exports.loginClient = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            logger.warn(`Client login failed for email ${email}: User not found.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Check if the user has the 'client' role
        if (user.role !== 'client') {
            logger.warn(`Client login failed: User ${email} is not a client.`);
            return res.status(403).json({ message: 'You do not have permission to log in here.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Client login failed for email ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = generateToken(user.id, user.role);

        logger.info(`Client logged in successfully: ${user.email}`);
        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during client login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};