const db = require('../models');
const logger = require('../utils/logger');
const Lease = db.Lease;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const Tenant = db.Tenant;
const Ledger = db.Ledger;
const { Op } = require('sequelize');
const { createLeaseSchema, updateLeaseSchema } = require('../utils/validator');

/**
 * Creates a new lease record and updates the tenant's ledger.
 * This is an administrative action handled by admins and property owners.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createLease = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id: userId } = req.user;
    const { listing_id, tenant_id, start_date, end_date, rent_amount, security_deposit } = req.body;

    const { error } = createLeaseSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during lease creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    // Find the listing and its associated property
    const listing = await Listing.findByPk(listing_id, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!listing) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Listing not found.' });
    }



    // Additional validation
    if (listing.status === 'closed') {
      await transaction.rollback();
      return res.status(400).json({ message: 'This listing is already leased and cannot be leased again.' });
    }

    const tenant = await Tenant.findByPk(tenant_id);
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tenant record not found.' });
    }

    const newLease = await Lease.create({
      property_id: listing.property.id,
      listing_id: listing.id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent: rent_amount,
      deposit: security_deposit,
      status: 'active',
    }, { transaction });

    const [ledger, created] = await Ledger.findOrCreate({
      where: { tenant_id },
      defaults: {
        tenant_id,
        balance: 0.00,
        deposit: 0.00
      },
      transaction,
    });

    await ledger.update({
      balance: parseFloat(ledger.balance) + parseFloat(rent_amount),
      deposit: parseFloat(ledger.deposit) + parseFloat(security_deposit)
    }, { transaction });

    // Update the listing status to 'closed'
    await listing.update({ status: 'closed' }, { transaction });

    logger.info(`New lease created for listing ${listing_id} with tenant ${tenant_id} by user ID ${userId}.`);
    await transaction.commit();
    res.status(201).json({ message: 'Lease created successfully.', lease: newLease });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error creating lease:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a single lease record by its ID.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getLeaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role: userRole } = req.user;

    const lease = await Lease.findByPk(id, {
      include: [
        { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
        // Use the Tenant model for the association
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'contact_info'] },
      ],
    });

    if (!lease) {
      return res.status(404).json({ message: 'Lease not found.' });
    }

    const isOwner = lease.listing.property.owner_id === userId;


    if (!isOwner) {
      logger.warn(`Unauthorized attempt to view lease ${id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to view this lease.' });
    }

    res.status(200).json(lease);
  } catch (error) {
    logger.error(`Error fetching lease ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a list of all leases based on user role.
 * Admins see all. Agents see their own.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllLeases = async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;
    const whereCondition = {};

    // CRITICAL SECURITY FIX: Agents should only see their own properties' leases
    if (userRole === 'agent') {
      const properties = await Property.findAll({ where: { owner_id: userId }, attributes: ['id'] });
      const propertyIds = properties.map(p => p.id);
      if (propertyIds.length === 0) {
        return res.status(200).json([]);
      }
      whereCondition['$listing.property_id$'] = { [Op.in]: propertyIds };
    }

    const leases = await Lease.findAll({
      where: whereCondition,
      include: [
        { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
        // Use the Tenant model for the association
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'contact_info'] },
      ],
    });

    res.status(200).json(leases);
  } catch (error) {
    logger.error('Error fetching all leases:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Updates an existing lease record.
 * This is an administrative action.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.updateLease = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { id: userId, role: userRole } = req.user;
    const { start_date, end_date, rent_amount, security_deposit, status } = req.body;

    const { error } = updateLeaseSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during lease update: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const lease = await Lease.findByPk(id, {
      include: [{ model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] }]
    });

    if (!lease) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lease not found.' });
    }

    const isOwner = lease.listing.property.owner_id === userId;
    if (!isOwner) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to update lease ${id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to update this lease.' });
    }

    const ledger = await Ledger.findOne({ where: { tenant_id: lease.tenant_id }, transaction });
    if (ledger) {
      const oldRent = parseFloat(lease.monthly_rent);
      const oldDeposit = parseFloat(lease.deposit);
      const newRent = parseFloat(rent_amount || oldRent);
      const newDeposit = parseFloat(security_deposit || oldDeposit);

      await ledger.update({
        balance: parseFloat(ledger.balance) - oldRent + newRent,
        deposit: parseFloat(ledger.deposit) - oldDeposit + newDeposit,
      }, { transaction });
    }

    // Update lease record
    await lease.update({ start_date, end_date, monthly_rent: rent_amount, deposit: security_deposit, status }, { transaction });

    logger.info(`Lease ${id} updated.`);
    await transaction.commit();
    res.status(200).json({ message: 'Lease updated successfully.', lease });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error updating lease ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a lease record and updates the tenant's ledger.
 * This is an administrative action for admins and property owners.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.deleteLease = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { id: userId, role: userRole } = req.user;

    // Find the lease and its associated property owner
    const lease = await Lease.findByPk(id, {
      include: [{ model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] }]
    });

    if (!lease) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lease not found.' });
    }

    const isOwner = lease.listing.property.owner_id === userId;
    if (!isOwner) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to delete lease ${id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to delete this lease.' });
    }

    const ledger = await Ledger.findOne({ where: { tenant_id: lease.tenant_id }, transaction });
    if (ledger) {
      await ledger.update({
        balance: parseFloat(ledger.balance) - parseFloat(lease.monthly_rent),
        deposit: parseFloat(ledger.deposit) - parseFloat(lease.deposit)
      }, { transaction });
    }

    // Find the associated listing and set its status back to active
    const listing = await Listing.findByPk(lease.listing_id);
    if (listing) {
      await listing.update({ status: 'active' }, { transaction });
    }

    await lease.destroy({ transaction });

    logger.info(`Lease ${id} deleted by user ID ${userId}.`);
    await transaction.commit();
    res.status(200).json({ message: 'Lease deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error deleting lease ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
