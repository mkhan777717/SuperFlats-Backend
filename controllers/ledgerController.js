const db = require('../models');
const logger = require('../utils/logger');
const LedgerEntry = db.LedgerEntry;
const Ledger = db.Ledger;
const Tenant = db.Tenant;
const { Op } = require('sequelize');

/**
 * Creates a new ledger entry for a specific tenant.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createEntry = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    const { tenantId } = req.params;
    const { description, amount, type, category, date } = req.body;

    // Validate input data
    if (!description || !amount || !type || !date) {
        await transaction.rollback();
        logger.warn(`Failed to create ledger entry: Missing required fields for tenant ${tenantId}.`);
        return res.status(400).json({ message: 'All fields (description, amount, type, date) are required.' });
    }

    if (type !== 'income' && type !== 'expense') {
        await transaction.rollback();
        logger.warn(`Failed to create ledger entry: Invalid type '${type}' for tenant ${tenantId}.`);
        return res.status(400).json({ message: 'Type must be either "income" or "expense".' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        await transaction.rollback();
        logger.warn(`Failed to create ledger entry: Invalid amount '${amount}' for tenant ${tenantId}.`);
        return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    try {
        const tenantLedger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            transaction
        });

        if (!tenantLedger) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Ledger not found for this tenant.' });
        }

        const newEntry = await LedgerEntry.create({
            description,
            amount,
            type,
            category: category || 'Uncategorized',
            date,
            tenant_id: tenantId
        }, { transaction });

        let newBalance = parseFloat(tenantLedger.balance);
        if (type === 'income') {
            newBalance += parseFloat(amount);
        } else {
            newBalance -= parseFloat(amount);
        }

        await tenantLedger.update({ balance: newBalance }, { transaction });

        await transaction.commit();
        logger.info(`New ledger entry created successfully for tenant ${tenantId}. Entry ID: ${newEntry.id}.`);
        res.status(201).json(newEntry);

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error creating ledger entry for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves all ledger entries for a specific tenant.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllEntries = async (req, res) => {
    const { tenantId } = req.params;
    const { type, startDate, endDate } = req.query;
    let whereClause = { tenant_id: tenantId };

    if (type) {
        whereClause.type = type;
    }

    if (startDate && endDate) {
        whereClause.date = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    try {
        const entries = await LedgerEntry.findAll({
            where: whereClause,
            order: [['date', 'DESC'], ['created_at', 'DESC']]
        });

        logger.info(`Retrieved ${entries.length} ledger entries for tenant ${tenantId}.`);
        res.status(200).json(entries);

    } catch (error) {
        logger.error(`Error fetching ledger entries for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a single ledger entry by its ID for a specific tenant.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getEntryById = async (req, res) => {
    const { tenantId, entryId } = req.params;

    try {
        const entry = await LedgerEntry.findOne({
            where: { id: entryId, tenant_id: tenantId }
        });

        if (!entry) {
            logger.warn(`Ledger entry with ID ${entryId} not found for tenant ${tenantId}.`);
            return res.status(404).json({ message: 'Ledger entry not found.' });
        }

        logger.info(`Ledger entry with ID ${entryId} retrieved for tenant ${tenantId}.`);
        res.status(200).json(entry);

    } catch (error) {
        logger.error(`Error fetching ledger entry by ID ${entryId} for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Updates an existing ledger entry for a specific tenant.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.updateEntry = async (req, res) => {
    const { tenantId, entryId } = req.params;

    const transaction = await db.sequelize.transaction();

    try {
        const entry = await LedgerEntry.findOne({
            where: { id: entryId, tenant_id: tenantId },
            transaction
        });

        if (!entry) {
            await transaction.rollback();
            logger.warn(`Failed to update ledger entry: Entry with ID ${entryId} not found for tenant ${tenantId}.`);
            return res.status(404).json({ message: 'Ledger entry not found.' });
        }

        const tenantLedger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            transaction
        });

        if (!tenantLedger) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Ledger not found for this tenant.' });
        }

        let oldBalance = parseFloat(tenantLedger.balance);
        if (entry.type === 'income') {
            oldBalance -= parseFloat(entry.amount);
        } else {
            oldBalance += parseFloat(entry.amount);
        }

        const updatedFields = req.body;
        await entry.update(updatedFields, { transaction });

        let newBalance = oldBalance;
        if (entry.type === 'income') {
            newBalance += parseFloat(entry.amount);
        } else {
            newBalance -= parseFloat(entry.amount);
        }

        await tenantLedger.update({ balance: newBalance }, { transaction });

        await transaction.commit();
        logger.info(`Ledger entry with ID ${entryId} updated for tenant ${tenantId}.`);
        res.status(200).json({ message: 'Ledger entry updated successfully.', entry });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error updating ledger entry by ID ${entryId} for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Deletes a ledger entry for a specific tenant.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.deleteEntry = async (req, res) => {
    const { tenantId, entryId } = req.params;

    const transaction = await db.sequelize.transaction();

    try {
        const entry = await LedgerEntry.findOne({
            where: { id: entryId, tenant_id: tenantId },
            transaction
        });

        if (!entry) {
            await transaction.rollback();
            logger.warn(`Failed to delete ledger entry: Entry with ID ${entryId} not found for tenant ${tenantId}.`);
            return res.status(404).json({ message: 'Ledger entry not found.' });
        }

        const tenantLedger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            transaction
        });

        if (!tenantLedger) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Ledger not found for this tenant.' });
        }

        let newBalance = parseFloat(tenantLedger.balance);
        if (entry.type === 'income') {
            newBalance -= parseFloat(entry.amount);
        } else {
            newBalance += parseFloat(entry.amount);
        }

        await tenantLedger.update({ balance: newBalance }, { transaction });
        await entry.destroy({ transaction });

        await transaction.commit();
        logger.info(`Ledger entry with ID ${entryId} deleted for tenant ${tenantId}.`);
        res.status(200).json({ message: 'Ledger entry deleted successfully.' });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error deleting ledger entry by ID ${entryId} for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a single ledger record for a specific tenant, including balance and deposit.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getLedgerByTenantId = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const ledger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            include: [{ model: Tenant, as: 'tenant' }]
        });

        if (!ledger) {
            return res.status(404).json({ message: 'Ledger not found for this tenant.' });
        }

        res.status(200).json(ledger);
    } catch (error) {
        logger.error(`Error fetching ledger for tenant ${req.params.tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
