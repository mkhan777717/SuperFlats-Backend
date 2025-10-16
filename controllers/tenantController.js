const db = require('../models');
const { Op, UniqueConstraintError } = require('sequelize');
const logger = require('../utils/logger');
const Tenant = db.Tenant;
const Booking = db.Booking;
const Flat = db.Flat;
const Property = db.Property;
const Photo = db.Photo;
const { uploadFile, deleteFile } = require('../utils/fileService');
const { createTenantSchema, updateTenantSchema, idProofUploadSchema } = require('../utils/validator');

/**
 * Creates a new tenant entity, associating it with the admin's company.
 * @param {object} req - The request object (must contain req.user.employee.company_id).
 * @param {object} res - The response object.
 */
exports.createTenant = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const companyId = req.user.employee.company_id;
    if (!companyId) {
      await transaction.rollback();
      return res.status(401).json({ message: 'User is not associated with a company.' });
    }

    const { error, value } = createTenantSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during tenant creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone_number, property_id } = value;

    // Verify the property exists and belongs to the same company
    const property = await Property.findOne({ where: { id: property_id, company_id: companyId } });
    if (!property) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Property not found or does not belong to your company.' });
    }

    const newTenant = await Tenant.create({
      name,
      phone_number,
      property_id,
      company_id: companyId,
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
 * @param {object} req - The request object (must contain req.user.employee.company_id).
 * @param {object} res - The response object.
 */
exports.getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.employee.company_id;

    const tenantProfile = await Tenant.findOne({
      where: {
        id: id,
        company_id: companyId
      },
      include: [
        { model: Property, as: 'property' }, // Include property details
        {
          model: Booking,
          as: 'bookings',
          include: [
            {
              model: Flat,
              as: 'flat',
              include: [
                {
                  model: Property,
                  as: 'property',
                }
              ]
            },
          ],
        },
        {
          model: Photo,
          as: 'photos',
          attributes: ['id', 'name', 'photo_url'],
          required: false,
          order: [['id', 'ASC']],
        }
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
 * @param {object} req - The request object (must contain req.user.employee.company_id).
 * @param {object} res - The response object.
 */
exports.getAllTenants = async (req, res) => {
  try {
    const {
      limit = 10,
      offset = 0,
      keywords,
      status,
      propertyId, // Add propertyId filter
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const companyId = req.user.employee.company_id;
    if (!companyId) {
      return res.status(401).json({ message: 'User is not associated with a company.' });
    }

    const finalWhere = { company_id: companyId };

    if (keywords) {
      finalWhere[Op.or] = [
        { name: { [Op.like]: `%${keywords}%` } },
        { phone_number: { [Op.like]: `%${keywords}%` } },
      ];
    }

    if (status) {
      finalWhere.status = status;
    }

    if (propertyId) {
      finalWhere.property_id = propertyId;
    }

    const validSortColumns = ['created_at', 'name'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[finalSortBy, finalSortOrder]];
    const finalLimit = parseInt(limit, 10);
    const finalOffset = parseInt(offset, 10);

    const { count, rows } = await Tenant.findAndCountAll({
      where: finalWhere,

      include: [
        { model: Property, as: 'property', attributes: ['id', 'name'] }, // Include property details
        {
          model: Photo,
          as: 'photos',
          required: false,
        }
      ],
      limit: finalLimit,
      offset: finalOffset,
      order: order,
      distinct: true,
      subQuery: false
    });

    logger.info(`Retrieved ${rows.length} of ${count} tenant profiles for company ${companyId}.`);
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / finalLimit),
      currentPage: Math.floor(finalOffset / finalLimit) + 1,
      tenants: rows,
    });

  } catch (error) {
    logger.error('Error fetching all tenant profiles:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves all tenant profiles for a specific property.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getTenantsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const {
      limit = 10,
      offset = 0,
      keywords,
      status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const companyId = req.user.employee.company_id;
    if (!companyId) {
      return res.status(401).json({ message: 'User is not associated with a company.' });
    }

    // Verify property exists and belongs to the company for authorization
    const property = await Property.findOne({ where: { id: propertyId, company_id: companyId } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found or does not belong to your company.' });
    }

    const finalWhere = {
      company_id: companyId,
      property_id: propertyId
    };

    if (keywords) {
      finalWhere[Op.or] = [
        { name: { [Op.like]: `%${keywords}%` } },
        { phone_number: { [Op.like]: `%${keywords}%` } },
      ];
    }

    if (status) {
      finalWhere.status = status;
    }

    const validSortColumns = ['created_at', 'name'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = [[finalSortBy, finalSortOrder]];

    const finalLimit = parseInt(limit, 10);
    const finalOffset = parseInt(offset, 10);

    const { count, rows } = await Tenant.findAndCountAll({
      where: finalWhere,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'name'] },
        { model: Photo, as: 'photos', required: false }
      ],
      limit: finalLimit,
      offset: finalOffset,
      order: order,
      distinct: true,
      subQuery: false
    });

    logger.info(`Retrieved ${rows.length} of ${count} tenants for property ID ${propertyId}.`);
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / finalLimit),
      currentPage: Math.floor(finalOffset / finalLimit) + 1,
      tenants: rows,
    });

  } catch (error) {
    logger.error(`Error fetching tenants for property ID ${req.params.propertyId}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


/**
 * Updates a tenant's profile, ensuring they belong to the user's company.
 * @param {object} req - The request object (must contain req.user.employee.company_id).
 * @param {object} res - The response object.
 */
exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.employee.company_id;

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
 * @param {object} req - The request object (must contain req.user.employee.company_id).
 * @param {object} res - The response object.
 */
exports.deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.employee.company_id;

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

/**
 * Retrieves all tenant entities that do not have an active booking.
 */
exports.getAvailableTenants = async (req, res) => {
  try {
    const company_id = req.user.employee.company_id;
    const tenants = await Tenant.findAll({
      attributes: ['id', 'name', 'phone_number'],
      where: {
        status: 'available',
        company_id: company_id
      },
      order: [['name', 'ASC']],
    });

    res.status(200).json(tenants);
  } catch (error) {
    logger.error('Error fetching available tenants:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Handles the upload of an ID proof document and links it to a tenant.
 * Enforces a maximum of 5 documents per tenant.
 */
exports.uploadTenantphotos = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { tenantId } = req.params;

    const { error, value } = idProofUploadSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    if (!tenantId || !req.file) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Tenant ID, document name, and a file are required.' });
    }

    const tenant = await Tenant.findByPk(tenantId, { transaction });
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tenant not found.' });
    }
    if (!req.user || !req.user.employee || tenant.company_id !== req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not authorized to add a document to this tenant.' });
    }

    const docCount = await Photo.count({
      where: { imageable_id: tenantId, imageable_type: 'Tenant' },
      transaction
    });

    if (docCount >= 5) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Maximum of 5 ID documents reached for this tenant.' });
    }

    const photoUrl = await uploadFile(req.file);

    const newIdProof = await Photo.create({
      photo_url: photoUrl,
      name: value.name,
      imageable_id: tenantId,
      imageable_type: 'Tenant',
      is_primary: false,
    }, { transaction });

    await transaction.commit();
    logger.info(`ID proof '${value.name}' uploaded for tenant ID ${tenantId}.`);
    res.status(201).json({ message: 'ID proof uploaded successfully.', document: newIdProof });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error uploading tenant ID proof:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a single ID proof document from a tenant by its ID.
 */
exports.deleteTenantphotos = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { tenantId, photoId } = req.params;

    const photo = await Photo.findByPk(photoId, { transaction });

    if (!photo) {
      await transaction.rollback();
      return res.status(404).json({ message: 'ID proof document not found.' });
    }

    // Security & Authorization Check
    if (photo.imageable_type !== 'Tenant' || photo.imageable_id !== parseInt(tenantId, 10)) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Document does not belong to the specified tenant.' });
    }

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['company_id'], transaction });
    if (!req.user || !req.user.employee || !tenant || tenant.company_id !== req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not authorized to perform this action.' });
    }

    try {
      await deleteFile(photo.photo_url, 'photo');
    } catch (err) {
      logger.warn(`Failed to delete ID proof from storage for photo ID ${photoId}: ${err.message}`);
    }

    await photo.destroy({ transaction });

    await transaction.commit();
    logger.info(`ID proof with ID ${photoId} deleted successfully from tenant ID ${tenantId}.`);
    res.status(200).json({ message: 'ID proof deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error deleting tenant ID proof with ID ${req.params.photoId}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};