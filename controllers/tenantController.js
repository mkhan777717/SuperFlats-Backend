const db = require('../models');
const { Op, UniqueConstraintError } = require('sequelize');
const logger = require('../utils/logger');
const Tenant = db.Tenant;
const Lease = db.Lease;
const Property = db.Property;
const { createTenantSchema, updateTenantSchema } = require('../utils/validator');

/**
 * Creates a new tenant entity, associating it with the admin's company.
 * @param {object} req - The request object (must contain req.user.company_id).
 * @param {object} res - The response object.
 */
exports.createTenant = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const companyId = req.user.company_id;

    const { error, value } = createTenantSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during tenant creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone_number, email, joined_at } = value;

    const newTenant = await Tenant.create({
      name,
      phone_number,
      email,
      joined_at,
      company_id: companyId,
      created_at: new Date()
    }, { transaction });

    await transaction.commit();
    logger.info(`New tenant with ID ${newTenant.id} created successfully for company ${companyId}.`);
    res.status(201).json({ message: 'Tenant created successfully.', tenant: newTenant });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }

    if (error instanceof UniqueConstraintError) {
      const field = Object.keys(error.fields)[0];
      const value = error.fields[field];

      logger.warn(`Tenant creation failed due to duplicate ${field}: ${value}`);

      return res.status(409).json({
        message: `The provided ${field} is already in use by another tenant.`,
        field,
        value
      });
    }

    logger.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a single tenant by ID, ensuring they belong to the user's company.
 * @param {object} req - The request object (must contain req.user.company_id).
 * @param {object} res - The response object.
 */
exports.getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const tenantProfile = await Tenant.findOne({
      where: {
        id: id,
        company_id: companyId
      },
      include: [
        {
          model: Lease,
          as: 'leases',
          include: [
            {
              model: Property,
              as: 'property',
            },
          ],
        },
      ],
    });

    if (!tenantProfile) {
      logger.warn(`Tenant profile with ID ${id} not found for company ${companyId}.`);
      return res.status(404).json({ message: 'Tenant not found.' });
    }

    logger.info(`Tenant profile with ID ${id} retrieved for company ${companyId}.`);
    res.status(200).json(tenantProfile);

  } catch (error) {
    logger.error(`Error fetching tenant profile with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves all tenant profiles, filtered by the user's company ID.
 * @param {object} req - The request object (must contain req.user.company_id).
 * @param {object} res - The response object.
 */
exports.getAllTenants = async (req, res) => {
  try {
    const { limit = 20, offset = 0, search } = req.query;
    const companyId = req.user.company_id;

    const finalWhere = { company_id: companyId };

    if (search) {
      finalWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
      ];
    }

    const tenants = await Tenant.findAll({
      where: finalWhere,
      attributes: ['id', 'name', 'email', 'phone_number', 'joined_at', 'created_at'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['joined_at', 'DESC']],
    });

    logger.info(`Retrieved ${tenants.length} tenant profiles for company ${companyId}.`);
    res.status(200).json(tenants);

  } catch (error) {
    logger.error('Error fetching all tenant profiles:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Updates a tenant's profile, ensuring they belong to the user's company.
 * @param {object} req - The request object (must contain req.user.company_id).
 * @param {object} res - The response object.
 */
exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const { error, value } = updateTenantSchema.validate(req.body);
    if (error) {
      logger.warn(`Validation failed during tenant update: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const tenant = await Tenant.findOne({
      where: {
        id: id,
        company_id: companyId
      }
    });

    if (!tenant) {
      logger.warn(`Tenant profile with ID ${id} not found for company ${companyId} for update.`);
      return res.status(404).json({ message: 'Tenant profile not found.' });
    }

    await tenant.update(value);

    logger.info(`Tenant profile with ID ${id} updated successfully for company ${companyId}.`);
    res.status(200).json({ message: 'Profile updated successfully.', tenant: tenant });

  } catch (error) {
    logger.error(`Error updating tenant profile with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a tenant profile, ensuring they belong to the user's company.
 * @param {object} req - The request object (must contain req.user.company_id).
 * @param {object} res - The response object.
 */
exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const deleted = await Tenant.destroy({
      where: {
        id: id,
        company_id: companyId
      },
    });

    if (deleted === 0) {
      logger.warn(`Tenant profile with ID ${id} not found for deletion in company ${companyId}.`);
      return res.status(404).json({ message: 'Tenant profile not found.' });
    }

    logger.info(`Tenant profile with ID ${id} deleted successfully from company ${companyId}.`);
    res.status(200).json({ message: 'Tenant profile deleted successfully.' });

  } catch (error) {
    logger.error(`Error deleting tenant profile with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};