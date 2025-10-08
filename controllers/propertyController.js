const db = require('../models');
const { Op, literal } = require('sequelize');
const logger = require('../utils/logger');
const { createPropertySchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');
const Property = db.Property;
const Photo = db.Photo;
const User = db.User;
const Company = db.Company;

/**
 * Creates a new property, its features, and photos in a single transaction.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { error } = createPropertySchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during property creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    if (!req.user || !req.user.employee || !req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
    }

    const company_id = req.user.employee.company_id;
    logger.info(`Creating property for company ID: ${company_id}`);

    const {
      name, description, address, city, state, zipcode,
      count_1rk, count_1bhk, count_2bhk, count_3bhk, count_3bhk_plus,
      area_sqft, parking, amenities, is_managed,
    } = req.body;

    const newProperty = await Property.create({
      company_id,
      name,
      description,
      address,
      city,
      state,
      zipcode,
      count_1rk,
      count_1bhk,
      count_2bhk,
      count_3bhk,
      count_3bhk_plus,
      area_sqft,
      parking,
      amenities,
      is_managed,
    }, { transaction });

    await transaction.commit();

    const propertyWithAssociations = await Property.findByPk(newProperty.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Photo, as: 'photos' }
      ]
    });

    logger.info(`New property created with ID: ${newProperty.id} for company ID: ${company_id}`);
    res.status(201).json({ message: 'Property created successfully.', property: propertyWithAssociations });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


/**
 * Retrieves a single property by its ID, including all related details.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Photo, as: 'photos' },
      ],
    });

    if (!property) {
      logger.warn(`Property with ID ${id} not found.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Response body standardized
    res.status(200).json({ property });

  } catch (error) {
    logger.error(`Error fetching property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Controller/Route Handler for retrieving properties with dynamic filtering, sorting, and pagination.
 * It enforces multi-tenancy by scoping results to the company_id found in the request token (req.user).
 *
 * @param {object} req - Express request object (includes req.query and req.user).
 * @param {object} res - Express response object.
 * @returns {void} - Sends a JSON response with paginated property data or an error status.
 */
exports.getProperties = async (req, res) => {
  if (!req.user || !req.user.employee || !req.user.employee.company_id) {
    return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
  }

  const queryParams = req.query;
  const company_id = req.user.employee.company_id;

  const {
    searchTerm,
    roomCountType,
    is_managed,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    limit = 10,
    offset = 0,
  } = queryParams;

  const whereConditions = {
    company_id: company_id,
  };

  const andConditions = [];

  const validSortColumns = ['created_at', 'name', 'area_sqft'];
  const validRoomCountTypes = ['1rk', '1bhk', '2bhk', '3bhk', '3bhk_plus'];


  // FIX APPLIED HERE: Using Op.like for MySQL compatibility
  if (searchTerm) {
    andConditions.push({
      [Op.or]: [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { address: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
      ],
    });
  }

  if (roomCountType && validRoomCountTypes.includes(roomCountType)) {
    const columnName = `count_${roomCountType}`;
    andConditions.push({ [columnName]: { [Op.gte]: 1 } });
  }

  if (is_managed !== undefined) {
    const isManagedBoolean = (is_managed === 'true' || is_managed === true);
    andConditions.push({ is_managed: isManagedBoolean });
  }

  if (andConditions.length > 0) {
    whereConditions[Op.and] = andConditions;
  }


  const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const finalLimit = parseInt(limit, 10);
  const finalOffset = parseInt(offset, 10);

  try {
    const results = await Property.findAndCountAll({
      where: whereConditions,
      include: [
        { model: Company, as: 'company' },
        { model: Photo, as: 'photos' },
      ],
      limit: finalLimit,
      offset: finalOffset,
      order: [[finalSortBy, finalSortOrder]],
    });

    const totalPages = Math.ceil(results.count / finalLimit);
    const currentPage = Math.floor(finalOffset / finalLimit) + 1;

    return res.json({
      totalItems: results.count,
      totalPages: totalPages,
      currentPage: currentPage,
      limit: finalLimit,
      properties: results.rows,
    });

  } catch (error) {
    logger.error('Error retrieving properties:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};



/**
 * Updates an existing property in a single transaction.
 * Enforces multi-tenancy.
 *
 * @param {object} req - The request object (includes req.params.id and req.body).
 * @param {object} res - The response object.
 */
exports.updateProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const propertyData = req.body;

    const property = await Property.findByPk(id, { transaction });
    if (!property) {
      await transaction.rollback();
      logger.warn(`Property with ID ${id} not found for update.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Authentication and Authorization Check (Corrected to use full path)
    if (!req.user || !req.user.employee || !req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
    }

    const userCompanyId = req.user.employee.company_id;

    if (property.company_id !== userCompanyId) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to update property ID ${id} by user from company ID ${userCompanyId}.`);
      return res.status(403).json({ message: 'You are not authorized to update this property.' });
    }

    // Update the property data
    await property.update(propertyData, { transaction });


    await transaction.commit();

    // Fetch the updated record with associations for the response
    const updatedPropertyWithAssociations = await Property.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Photo, as: 'photos' }
      ]
    });

    logger.info(`Property with ID ${id} updated successfully by user from company ID ${userCompanyId}.`);
    res.status(200).json({ message: 'Property updated successfully.', property: updatedPropertyWithAssociations });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error updating property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a single photo from a property by its ID.
 * @param {object} req - The request object containing the photo ID in params.
 * @param {object} res - The response object.
 */
exports.deletePhoto = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { photoId } = req.params;

    if (!photoId) {
      await transaction.rollback();
      logger.warn('Photo ID is required for deletion.');
      return res.status(400).json({ message: 'Photo ID is required.' });
    }

    const photo = await Photo.findByPk(photoId, {
      include: [{ model: Property, as: 'property' }],
      transaction
    });

    if (!photo) {
      await transaction.rollback();
      logger.warn(`Photo with ID ${photoId} not found.`);
      return res.status(404).json({ message: 'Photo not found.' });
    }

    if (!req.user || !req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
    }

    if (photo.property.company_id !== req.user.employee.company_id) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to delete photo ID ${photoId} from property ID ${photo.property.id} by user from company ID ${req.user.employee.company_id}.`);
      return res.status(403).json({ message: 'You are not authorized to delete this photo.' });
    }

    const wasPrimary = photo.is_primary;

    await deleteFile(photo.photo_url, 'photo');
    await photo.destroy({ transaction });

    if (wasPrimary) {
      const remainingPhotos = await Photo.findAll({
        where: { property_id: photo.property_id },
        order: [['id', 'ASC']],
        limit: 1,
        transaction,
      });

      if (remainingPhotos.length > 0) {
        const newPrimaryPhoto = remainingPhotos[0];
        await newPrimaryPhoto.update({ is_primary: true }, { transaction });
        logger.info(`Assigned new primary photo with ID ${newPrimaryPhoto.id} for property ID ${photo.property.id}.`);
      }
    }

    await transaction.commit();
    logger.info(`Photo with ID ${photoId} deleted successfully by user from company ID ${req.user.employee.company_id}.`);
    res.status(200).json({ message: 'Photo deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error deleting photo with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a property and all its associated photos in a single transaction.
 * Enforces multi-tenancy.
 *
 * @param {object} req - The request object (includes req.params.id).
 * @param {object} res - The response object.
 */
exports.deleteProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id, { transaction });
    if (!property) {
      await transaction.rollback();
      logger.warn(`Property with ID ${id} not found for deletion.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Authentication and Authorization Check (Corrected to use full path)
    if (!req.user || !req.user.employee || !req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
    }

    const userCompanyId = req.user.employee.company_id;

    if (property.company_id !== userCompanyId) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to delete property ID ${id} by user from company ID ${userCompanyId}.`);
      return res.status(403).json({ message: 'You are not authorized to delete this property.' });
    }

    // 1. Find all photos to delete files from storage
    const photosToDelete = await Photo.findAll({ where: { property_id: id }, transaction });
    await Promise.all(photosToDelete.map(photo => deleteFile(photo.photo_url, 'photo')));

    // 2. Delete associated records (Photos)
    await Photo.destroy({ where: { property_id: id }, transaction });
    // Note: PropertyFeature deletion is excluded per user request

    // 3. Delete the property itself
    await property.destroy({ transaction });

    await transaction.commit();
    logger.info(`Property with ID ${id} deleted successfully by user from company ID ${userCompanyId}.`);
    res.status(200).json({ message: 'Property and its associated data deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error deleting property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Handles the upload of a single photo and links it to a property.
 * @param {object} req - The request object.
 * @param {string} req.params.id - The ID of the property to link the photo to.
 * @param {object} res - The response object.
 */
exports.uploadPhoto = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const propertyId = req.params.id;

    if (!propertyId) {
      await transaction.rollback();
      logger.warn('Property ID is required for photo upload.');
      return res.status(400).json({ message: 'Property ID is required.' });
    }

    if (!req.file) {
      await transaction.rollback();
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const photoCount = await Photo.count({
      where: { property_id: propertyId },
      transaction,
    });

    if (photoCount >= 10) {
      await transaction.rollback();
      logger.warn(`Attempt to upload more than 10 photos for property ID ${propertyId}.`);
      return res.status(400).json({ message: 'Maximum of 10 photos allowed per property.' });
    }

    const property = await Property.findByPk(propertyId, { transaction });
    if (!property) {
      await transaction.rollback();
      logger.warn(`Property with ID ${propertyId} not found.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (!req.user || !req.user.employee.company_id) {
      await transaction.rollback();
      return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
    }

    if (property.company_id !== req.user.employee.company_id) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to add a photo to property ID ${propertyId} by user from company ID ${req.user.employee.company_id}.`);
      return res.status(403).json({ message: 'You are not authorized to add photos to this property.' });
    }

    const photoUrl = await uploadFile(req.file);

    const newPhoto = await Photo.create({
      property_id: propertyId,
      photo_url: photoUrl,
      is_primary: false,
    }, { transaction });

    await transaction.commit();
    logger.info(`Photo uploaded and linked to property ID ${propertyId} by user from company ID ${req.user.employee.company_id}.`);
    res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
