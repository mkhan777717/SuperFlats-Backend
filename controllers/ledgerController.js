const db = require('../models');
const logger = require('../utils/logger');
const LedgerEntry = db.LedgerEntry;
const Ledger = db.Ledger;
const Tenant = db.Tenant;
const { Op } = require('sequelize');

const { createLedgerEntrySchema, updateLedgerEntrySchema } = require('../utils/validator');
exports.createEntry = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    const { tenantId } = req.params;
    const companyId = req.user.company_id;

    const { error, value } = createLedgerEntrySchema.validate(req.body);
    if (error) {
        await transaction.rollback();
        logger.warn(`Validation failed during ledger entry creation: ${error.details[0].message}`);
        return res.status(400).json({ message: error.details[0].message });
    }

    const { description, amount, type, category, date } = value;

    try {
        const tenant = await Tenant.findOne({
            where: { id: tenantId, company_id: companyId },
            transaction
        });

        if (!tenant) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Tenant not found for this company.' });
        }

        const tenantLedger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            transaction
        });

        if (!tenantLedger) {
            await transaction.rollback();
            return res.status(500).json({ message: 'Internal error: Tenant Ledger not initialized.' });
        }

        const entry = await LedgerEntry.create({
            description,
            amount,
            type,
            category,
            date,
            tenant_id: tenantId,
            ledger_id: tenantLedger.id,
        }, { transaction });

        let newBalance = parseFloat(tenantLedger.balance);
        const entryAmount = parseFloat(amount);
        if (type === 'income') {
            newBalance += entryAmount;
        } else {
            newBalance -= entryAmount;
        }

        await tenantLedger.update({ balance: newBalance }, { transaction });

        await transaction.commit();

        const newEntryWithTenant = await LedgerEntry.findByPk(entry.id, {
            include: [{
                model: Tenant,
                as: 'tenant',

            }]
        });

        logger.info(`New ledger entry created successfully for tenant ${tenantId}. Entry ID: ${entry.id}.`);
        res.status(201).json({ message: "Ledger Entry created successfully.", entry: newEntryWithTenant });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error creating ledger entry for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


exports.getAllEntries = async (req, res) => {
    const { tenantId } = req.params;
    const { type, startDate, endDate } = req.query;
    const companyId = req.user.company_id;
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
        const tenantCheck = await Tenant.findOne({
            where: { id: tenantId, company_id: companyId },
            attributes: ['id']
        });

        if (!tenantCheck) {
            logger.warn(`Access denied: Tenant ID ${tenantId} not found for company ${companyId}.`);
            return res.status(404).json({ message: 'Tenant or resources not found.' });
        }

        const entries = await LedgerEntry.findAll({
            where: whereClause,
            include: [{
                model: Tenant,
                as: 'tenant', 
                where: { company_id: companyId }
            }],
            order: [['date', 'DESC'], ['created_at', 'DESC']]
        });

        logger.info(`Retrieved ${entries.length} ledger entries for tenant ${tenantId}.`);
        res.status(200).json(entries);

    } catch (error) {
        logger.error(`Error fetching ledger entries for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.getEntryById = async (req, res) => {
    const { tenantId, entryId } = req.params;
    const companyId = req.user.company_id;

    try {
        const entry = await LedgerEntry.findOne({
            where: { id: entryId, tenant_id: tenantId },
            include: [{
                model: Tenant,
                as: 'tenant',
                where: { company_id: companyId }
            }]
        });

        if (!entry) {
            logger.warn(`Ledger entry with ID ${entryId} not found for tenant ${tenantId} or company ${companyId}.`);
            return res.status(404).json({ message: 'Ledger entry not found.' });
        }

        logger.info(`Ledger entry with ID ${entryId} retrieved for tenant ${tenantId}.`);
        res.status(200).json(entry);

    } catch (error) {
        logger.error(`Error fetching ledger entry by ID ${entryId} for tenant ${tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.updateEntry = async (req, res) => {
    const { tenantId, entryId } = req.params;
    const companyId = req.user.company_id;
    const transaction = await db.sequelize.transaction();

    const { error, value: updatedFields } = updateLedgerEntrySchema.validate(req.body);
    if (error) {
        await transaction.rollback();
        logger.warn(`Validation failed during ledger entry update: ${error.details[0].message}`);
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        const entry = await LedgerEntry.findOne({
            where: { id: entryId, tenant_id: tenantId },
            include: [{
                model: Tenant,
                as: 'tenant',
                where: { company_id: companyId }
            }],
            transaction
        });

        if (!entry) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Ledger entry not found for this company.' });
        }

        const tenantLedger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            transaction
        });

        const oldAmount = parseFloat(entry.amount);
        const oldType = entry.type;

        const effectiveNewAmount = parseFloat(updatedFields.amount || entry.amount);
        const effectiveNewType = updatedFields.type || entry.type;


        let balanceAdjustment = 0;
        balanceAdjustment -= (oldType === 'income' ? oldAmount : -oldAmount);

        balanceAdjustment += (effectiveNewType === 'income' ? effectiveNewAmount : -effectiveNewAmount);

        await entry.update(updatedFields, { transaction });

        const newLedgerBalance = parseFloat(tenantLedger.balance) + balanceAdjustment;

        await tenantLedger.update({ balance: newLedgerBalance }, { transaction });

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

exports.deleteEntry = async (req, res) => {
    const { tenantId, entryId } = req.params;
    const companyId = req.user.company_id;
    const transaction = await db.sequelize.transaction();

    try {
        const entry = await LedgerEntry.findOne({
            where: { id: entryId, tenant_id: tenantId },
            include: [{
                model: Tenant,
                as: 'tenant',
                where: { company_id: companyId }
            }],
            transaction
        });

        if (!entry) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Ledger entry not found for this company.' });
        }

        const tenantLedger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            transaction
        });

        let newBalance = parseFloat(tenantLedger.balance);
        const entryAmount = parseFloat(entry.amount);
        if (entry.type === 'income') {
            newBalance -= entryAmount;
        } else {
            newBalance += entryAmount;
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


exports.getLedgerSummaryByTenantId = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const companyId = req.user.company_id;
        const ledger = await Ledger.findOne({
            where: { tenant_id: tenantId },
            include: [{
                model: Tenant,
                as: 'tenant',
                where: { company_id: companyId }
            }]
        });

        if (!ledger) {
            return res.status(404).json({ message: 'Ledger or Tenant not found for this company.' });
        }

        res.status(200).json(ledger);
    } catch (error) {
        logger.error(`Error fetching ledger for tenant ${req.params.tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


exports.getAllLedgerSummaries = async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const allLedgerSummaries = await db.Ledger.findAll({
            include: [{
                model: db.Tenant,
                as: 'tenant',
                where: { company_id: companyId }
            }],
            order: [[{ model: db.Tenant, as: 'tenant' }, 'name', 'ASC']]
        });

        if (allLedgerSummaries.length === 0) {
            logger.info(`No ledger summaries found for company ${companyId}.`);
            return res.status(200).json([]);
        }

        logger.info(`Retrieved ${allLedgerSummaries.length} ledger summaries for company ${companyId}.`);
        res.status(200).json(allLedgerSummaries);

    } catch (error) {
        logger.error('Error fetching all ledger summaries:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.getAllCompanyEntries = async (req, res) => {
    const companyId = req.user.company_id;
    const { type, startDate, endDate } = req.query;

    let whereClause = {}; // Base where clause for LedgerEntry

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
            include: [{
                model: Tenant,
                as: 'tenant',
                where: { company_id: companyId },
                attributes: { exclude: ['company_id', 'created_at', 'updated_at'] }
            }],
            order: [['date', 'DESC'], ['created_at', 'DESC']]
        });

        if (entries.length === 0) {
            logger.info(`No ledger entries found for company ${companyId}.`);
            return res.status(200).json([]);
        }

        logger.info(`Retrieved ${entries.length} ledger entries for company ${companyId}.`);
        res.status(200).json(entries);

    } catch (error) {
        logger.error(`Error fetching all company ledger entries for company ${companyId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};