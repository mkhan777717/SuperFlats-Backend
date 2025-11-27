const db = require('../models');
const crypto = require('crypto');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRegistrationSchema } = require('../utils/validator');


const User = db.User;
const Company = db.Company; 
const Employee = db.Employee; 
const RefreshToken = db.RefreshToken; 
const sequelize = db.sequelize; 

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
const generateAccessToken = (id, role, company_id) => {
    const payload = { id, role };
    if (company_id) {
        payload.company_id = company_id;
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d', //for now 30 days untill we implement it in our frontend
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { 
        expiresIn: '90d',
    });
};
//TODO: for now the refresh token is supports only one active token per user
const saveRefreshToken = async (userId, token) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);
    await RefreshToken.destroy({ where: { token: hashToken(token) } }); 
    await RefreshToken.create({
        token: hashToken(token),
        userId: userId,
        expiryDate: expiryDate,
    });
}



exports.registerAdmin = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, email, password, phone_number } = req.body;
        const role = 'admin';

        const { error } = userRegistrationSchema.validate(req.body);
        if (error) {
            logger.warn(`Validation failed during admin registration: ${error.details[0].message}`);
            await t.rollback();
            return res.status(400).json({ message: error.details[0].message });
        }

        const userExists = await User.findOne({ where: { email }, transaction: t });
        if (userExists) {
            logger.warn(`Admin registration failed: User with email '${email}' already exists.`);
            await t.rollback();
            return res.status(409).json({ message: `Email already exists.` });
        }

        const phoneNumberExists = await User.findOne({
            where: { phone_number, role: ['admin', 'agent'] },
            transaction: t
        });
        if (phoneNumberExists) {
            logger.warn(`Admin registration failed: Phone number '${phone_number}' is already in use by an admin or agent.`);
            await t.rollback();
            return res.status(409).json({ message: 'This phone number is already registered to an admin or agent account.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newCompany = await Company.create({
            name: `${name}'s Company`,
        }, { transaction: t });

        const newUser = await User.create({
            name, email, phone_number, role,
            password: hashedPassword,
            company_id: newCompany.id 
        }, { transaction: t });

        await Employee.create({
            user_id: newUser.id,
            company_id: newCompany.id,
        }, { transaction: t });

        await t.commit();
        
        const accessToken = generateAccessToken(newUser.id, newUser.role, newCompany.id);
        const refreshToken = generateRefreshToken(newUser.id);
        await saveRefreshToken(newUser.id, refreshToken); 

        logger.info(`New admin registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone_number: newUser.phone_number,
            role: newUser.role,
            company_id: newCompany.id,
            accessToken, 
            refreshToken, 
        });

    } catch (error) {
        await t.rollback();
        logger.error(`Error during admin registration for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.registerClient = async (req, res) => {
    try {
        const { name, email, password, phone_number } = req.body;
        const role = 'client';

        const { error } = userRegistrationSchema.validate(req.body);
        if (error) {
            logger.warn(`Validation failed during client registration: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            logger.warn(`Client registration failed: User with email '${email}' already exists.`);
            return res.status(409).json({ message: `A user with this email already exists.` });
        }

        const phoneNumberExists = await User.findOne({
            where: { phone_number, role: 'client' }
        });
        if (phoneNumberExists) {
            logger.warn(`Client registration failed: Phone number '${phone_number}' is already in use by a client.`);
            return res.status(409).json({ message: 'This phone number is already registered to a client account.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await User.create({
            name, email, phone_number, role,
            password: hashedPassword,
        });

        
        const accessToken = generateAccessToken(newUser.id, newUser.role);
        const refreshToken = generateRefreshToken(newUser.id);
        await saveRefreshToken(newUser.id, refreshToken); 

        logger.info(`New client registered successfully: ${newUser.email}`);
        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone_number: newUser.phone_number,
            role: newUser.role,
            accessToken,
            refreshToken,
        });

    } catch (error) {
        logger.error(`Error during client registration for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            logger.warn(`Admin/agent login failed for email ${email}: User not found.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (user.role !== 'admin' && user.role !== 'agent') {
            logger.warn(`Login failed: User ${email} is not an admin or agent.`);
            return res.status(401).json({ message: 'You do not have permission to log in here.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Admin login failed for email ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const employee = await Employee.findOne({ where: { user_id: user.id } });
        const companyId = employee ? employee.company_id : null;

        
        const accessToken = generateAccessToken(user.id, user.role, companyId);
        const refreshToken = generateRefreshToken(user.id);
        await saveRefreshToken(user.id, refreshToken); 

        logger.info(`Admin/agent logged in successfully: ${user.email}`);
        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
            company_id: companyId,
            accessToken,
            refreshToken,
        });

    } catch (error) {
        logger.error(`Error during admin/agent login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.loginClient = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            logger.warn(`Client login failed for email ${email}: User not found.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (user.role !== 'client') {
            logger.warn(`Client login failed: User ${email} is not a client.`);
            return res.status(403).json({ message: 'You do not have permission to log in here.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Client login failed for email ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        
        const accessToken = generateAccessToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id);
        await saveRefreshToken(user.id, refreshToken); 

        logger.info(`Client logged in successfully: ${user.email}`);
        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role,
            accessToken,
            refreshToken,
        });

    } catch (error) {
        logger.error(`Error during client login for email ${req.body.email}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * NEW ENDPOINT: Endpoint to refresh the Access Token using a valid Refresh Token.
 * Implements token rotation for security.
 */
exports.tokenRefresh = async (req, res) => {
    const { refreshToken: incomingToken } = req.body;

    if (!incomingToken) {
        return res.status(400).json({ message: 'Refresh Token required' });
    }

    try {
        
        const decoded = jwt.verify(incomingToken, process.env.JWT_REFRESH_SECRET);
        const userId = decoded.id;

        
     const hashedIncoming = hashToken(incomingToken);

    const storedToken = await RefreshToken.findOne({
    where: { token: hashedIncoming, userId }
    });


        if (!storedToken) {
            
            logger.warn(`[Security] Refresh Token not found/invalid for user ${userId}`);
            return res.status(401).json({ message: 'Invalid Refresh Token' });
        }

        
        if (storedToken.expiryDate < new Date()) {
            await RefreshToken.destroy({ where: { id: storedToken.id } }); 
            return res.status(401).json({ message: 'Refresh token was expired. Please make a new signin request' });
        }

        
        
        await RefreshToken.destroy({ where: { id: storedToken.id } });
        

        
        const user = await User.findByPk(userId);
        let companyId = null;
        if (user.role === 'admin' || user.role === 'agent') {
            const employee = await Employee.findOne({ where: { user_id: user.id } });
            companyId = employee ? employee.company_id : null;
        }

        
        const newAccessToken = generateAccessToken(user.id, user.role, companyId);
        const newRefreshToken = generateRefreshToken(user.id);
        await saveRefreshToken(user.id, newRefreshToken); 

        logger.info(`Token refreshed successfully for user ID: ${user.id}`);
        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });

    } catch (error) {
        logger.error('Error during token refresh (jwt verification failed):', error);
        res.status(401).json({ message: 'Invalid or expired Refresh Token' });
    }
};