const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const Tenant = db.Tenant;
const Lease = db.Lease;
const Property = db.Property;
const Listing = db.Listing;
const { createTenantSchema, updateTenantSchema } = require('../utils/validator');

/**
 * Creates a new tenant entity. This is an admin-only function.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createTenant = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { error, value } = createTenantSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during tenant creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, contact_info, joinDate } = value;
    
    // Create a new tenant record, using the provided joinDate or defaulting to now
    const newTenant = await Tenant.create({
      name,
      contact_info,
      joinDate: joinDate || new Date(),
      created_at: new Date()
    }, { transaction });

    await transaction.commit();
    logger.info(`New tenant with ID ${newTenant.id} created successfully by user ${req.user.id}.`);
    res.status(201).json({ message: 'Tenant created successfully.', tenant: newTenant });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a single tenant by ID, including their associated leases and properties.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenantProfile = await Tenant.findByPk(id, {
      include: [
        {
          model: Lease,
          as: 'leases',
          include: [
            // FIX: Correctly include the Property from the Lease association
            {
              model: Property,
              as: 'property',
            },
          ],
        },
      ],
    });

    if (!tenantProfile) {
      logger.warn(`Tenant profile with ID ${id} not found.`);
      return res.status(404).json({ message: 'Tenant not found.' });
    }

    logger.info(`Tenant profile with ID ${id} retrieved by user ${req.user.id}.`);
    res.status(200).json(tenantProfile);

  } catch (error) {
    logger.error(`Error fetching tenant profile with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves all tenant profiles with optional filtering and pagination.
 * This is primarily for admin use.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllTenants = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search } = req.query;
    const whereCondition = {};

    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact_info: { [Op.like]: `%${search}%` } },
      ];
    }

    const tenants = await Tenant.findAll({
      where: whereCondition,
      attributes: ['id', 'name', 'contact_info', 'joinDate', 'created_at'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['joinDate', 'DESC']],
    });

    logger.info(`Retrieved ${tenants.length} tenant profiles by user ${req.user.id}.`);
    res.status(200).json(tenants);

  } catch (error) {
      logger.error('Error fetching all tenant profiles:', error);
      res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Updates a tenant's profile.
 * This is an administrative action.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.updateTenantProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = updateTenantSchema.validate(req.body);
    if (error) {
      logger.warn(`Validation failed during tenant update: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    // FIX: Find the tenant first, then update the instance.
    const profile = await Tenant.findByPk(id);

    if (!profile) {
      logger.warn(`Tenant profile with ID ${id} not found for update.`);
      return res.status(404).json({ message: 'Tenant profile not found.' });
    }

    // Update the profile instance
    await profile.update(req.body);

    logger.info(`Tenant profile with ID ${id} updated successfully by user ${req.user.id}.`);
    res.status(200).json({ message: 'Profile updated successfully.', profile: profile });

  } catch (error) {
    logger.error(`Error updating tenant profile with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a tenant profile.
 * This is an administrative action.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Tenant.destroy({
      where: { id: id },
    });

    if (deleted === 0) {
      logger.warn(`Tenant profile with ID ${id} not found for deletion.`);
      return res.status(404).json({ message: 'Tenant profile not found.' });
    }

    logger.info(`Tenant profile with ID ${id} deleted by admin user ${req.user.id}.`);
    res.status(200).json({ message: 'Tenant profile deleted successfully.' });

  } catch (error) {
    logger.error(`Error deleting tenant profile with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};