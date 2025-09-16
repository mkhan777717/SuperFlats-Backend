const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRegistrationSchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');
const User = db.User;
const Company = db.Company; 
const Employee = db.Employee; 
const sequelize = db.sequelize; 

// Generate a JWT token
const generateToken = (id, role, company_id) => {
    // Include company_id in the token payload for admins/agents
    const payload = { id, role };
    if (company_id) {
        payload.company_id = company_id;
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Register a new user with a hardcoded 'admin' role
exports.registerAdmin = async (req, res) => {
    // Start a transaction to ensure all database operations are successful or none are
    const t = await sequelize.transaction();
    try {
        const { name, email, password, phone_number } = req.body;
        const role = 'admin';

        // Validate request body against Joi schema
        const { error } = userRegistrationSchema.validate(req.body);
        if (error) {
            logger.warn(`Validation failed during admin registration: ${error.details[0].message}`);
            await t.rollback();
            return res.status(400).json({ message: error.details[0].message });
        }

        // Check if a user with the same email already exists
        const userExists = await User.findOne({ where: { email }, transaction: t });
        if (userExists) {
            logger.warn(`Admin registration failed: User with email '${email}' already exists.`);
            await t.rollback();
            return res.status(409).json({ message: `A user with this email already exists.` });
        }

        // Check if a user with the same phone number already exists for admin/agent roles
        const phoneNumberExists = await User.findOne({
            where: {
                phone_number,
                role: ['admin', 'agent']
            },
            transaction: t
        });
        if (phoneNumberExists) {
            logger.warn(`Admin registration failed: Phone number '${phone_number}' is already in use by an admin or agent.`);
            await t.rollback();
            return res.status(409).json({ message: 'This phone number is already registered to an admin or agent account.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Step 1: Create a new company record
        const newCompany = await Company.create({
            name: `${name}'s Company`,
        }, { transaction: t });

        // Step 2: Create the new admin user
        const newUser = await User.create({
            name,
            email,
            phone_number,
            role,
            password: hashedPassword,
            company_id: newCompany.id // FIX: Set the company_id here during creation
        }, { transaction: t });

        // Step 3: Create an employee record to associate the admin user with the new company
        await Employee.create({
            user_id: newUser.id,
            company_id: newCompany.id,
        }, { transaction: t });

        // If all steps are successful, commit the transaction
        await t.commit();

        // Generate and send a token, including the new company_id
        const token = generateToken(newUser.id, newUser.role, newCompany.id);

        logger.info(`New admin registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone_number: newUser.phone_number,
            role: newUser.role,
            company_id: newCompany.id,
            token,
        });

    } catch (error) {
        // Rollback the transaction on any error
        await t.rollback();
        logger.error(`Error during admin registration for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Register a new user with a hardcoded 'client' role
exports.registerClient = async (req, res) => {
    try {
        const { name, email, password, phone_number } = req.body;
        const role = 'client';

        // Validate request body against Joi schema
        const { error } = userRegistrationSchema.validate(req.body);
        if (error) {
            logger.warn(`Validation failed during client registration: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        // Check if a user with the same email already exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            logger.warn(`Client registration failed: User with email '${email}' already exists.`);
            return res.status(409).json({ message: `A user with this email already exists.` });
        }

        // Check if a user with the same phone number already exists for the client role
        const phoneNumberExists = await User.findOne({
            where: {
                phone_number,
                role: 'client'
            }
        });
        if (phoneNumberExists) {
            logger.warn(`Client registration failed: Phone number '${phone_number}' is already in use by a client.`);
            return res.status(409).json({ message: 'This phone number is already registered to a client account.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new client user
        const newUser = await User.create({
            name,
            email,
            phone_number,
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
            phone_number: newUser.phone_number,
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

        // Check if the user has the 'admin' or 'agent' role
        if (user.role !== 'admin' && user.role !== 'agent') {
            logger.warn(`Login failed: User ${email} is not an admin or agent.`);
            return res.status(403).json({ message: 'You do not have permission to log in here.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Admin login failed for email ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Find the employee record to get the company_id
        const employee = await Employee.findOne({ where: { user_id: user.id } });
        const companyId = employee ? employee.company_id : null;

        const token = generateToken(user.id, user.role, companyId);

        logger.info(`Admin/agent logged in successfully: ${user.email}`);
        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
            company_id: companyId,
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
            phone_number: user.phone_number,
            role: user.role,
            token,
        });

    } catch (error) {
        logger.error(`Error during client login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
