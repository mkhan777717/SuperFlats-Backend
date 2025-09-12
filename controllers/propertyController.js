const db = require('../models');
const { Op, literal } = require('sequelize');
const logger = require('../utils/logger');
const { createPropertySchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');
const Property = db.Property;
const PropertyFeature = db.PropertyFeature;
const PropertyPhoto = db.PropertyPhoto;
const User = db.User;
const axios = require('axios');
const Listing = db.Listing;

/**
 * Helper function to get latitude and longitude from an address using a geocoding service.
 * @param {string} address - The street address.
 * @param {string} city - The city.
 * @param {string} state - The state.
 * @param {string} zipcode - The postal code.
 * @returns {Promise<{latitude: number|null, longitude: number|null}>} The coordinates.
 */
const getLatLongFromAddress = async (address, city, state, zipcode) => {
  const fullAddress = `${address}, ${city}, ${state} ${zipcode}`;
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: fullAddress,
        format: 'json',
        limit: 1,
      },
      headers: {
        // A user-agent header is required by Nominatim's terms of service.
        'User-Agent': 'SuperFlatsApp/1.0 (contact@example.com)'
      }
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    }
  } catch (error) {
    logger.error(`Geocoding failed for address: ${fullAddress}`, error);
  }
  return { latitude: null, longitude: null };
};

/**
 * Creates a new property, its features, and photos in a single transaction.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    // Validate request body against a Joi schema
    const { error } = createPropertySchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during property creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }


    // Get the owner_id securely from the authenticated user's token
    const owner_id = req.user.id;
    // UPDATED: Destructure the isManaged field from the request body.
    const { title, description, property_type, address, city, state, zipcode, features, isManaged } = req.body;

    // Get latitude and longitude from the address
    const { latitude, longitude } = await getLatLongFromAddress(address, city, state, zipcode);

    // Step 1: Create the property within the transaction
    const newProperty = await Property.create({
      owner_id,
      title,
      description,
      property_type,
      address,
      city,
      state,
      zipcode,
      latitude,
      longitude,
      // Pass the isManaged value if it exists, otherwise Sequelize will use the default 'false'.
      isManaged,
    }, { transaction });

    // Step 2: Create associated features within the same transaction
    if (features) {
      await PropertyFeature.create({
        property_id: newProperty.id,
        ...features,
      }, { transaction });
    }



    // Step 3: Commit the transaction
    await transaction.commit();
    logger.info(`New property created with ID: ${newProperty.id} by user ID: ${owner_id}`);
    res.status(201).json({ message: 'Property created successfully.', property: newProperty });

  } catch (error) {
    // Rollback the transaction in case of any error
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Helper function to build dynamic query conditions based on request query parameters.
 * @param {object} query - The request query object.
 * @returns {{conditions: object, featureConditions: object}} The generated Sequelize conditions.
 */
const buildQueryConditions = (query) => {
  const conditions = {};
  const featureConditions = {};
  const allowedFeatures = ['bedrooms', 'bathrooms', 'area_sqft', 'furnishing', 'parking', 'amenities'];

  if (query.city) {
    conditions.city = { [Op.like]: `%${query.city}%` };
  }
  if (query.state) {
    conditions.state = { [Op.like]: `%${query.state}%` };
  }
  if (query.zipcode) {
    conditions.zipcode = query.zipcode;
  }
  if (query.type) {
    conditions.property_type = { [Op.like]: `%${query.type}%` };
  }
  if (query.isManaged !== undefined) {
    // Ensure the string 'true' or 'false' is converted to a boolean value.
    const isManagedValue = JSON.parse(query.isManaged.toLowerCase());
    conditions.isManaged = isManagedValue;
  }

  // UPDATED: Add fuzzy search logic using SOUNDEX
  if (query.search) {
    conditions[Op.or] = [
      // Standard case-insensitive substring search
      { title: { [Op.like]: `%${query.search}%` } },
      { description: { [Op.like]: `%${query.search}%` } },
      // Fuzzy search using the SOUNDEX function
      literal(`SOUNDEX(title) = SOUNDEX('${query.search}')`),
      literal(`SOUNDEX(description) = SOUNDEX('${query.search}')`),
    ];
  }

  // Handle proximity search using latitude, longitude, and radius
  if (query.latitude && query.longitude && query.radius) {
    const lat = parseFloat(query.latitude);
    const lon = parseFloat(query.longitude);
    const radius = parseFloat(query.radius);
    const earthRadiusMiles = 3959;

    // Use a literal to perform the Haversine formula calculation in SQL.
    // This is more efficient than fetching all properties and filtering in application code.
    conditions[Op.and] = conditions[Op.and] || [];
    conditions[Op.and].push(literal(`
      ${earthRadiusMiles} * acos(
        cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) +
        sin(radians(${lat})) * sin(radians(latitude))
      ) < ${radius}
    `));
  }

  // Handle feature-based filters
  for (const feature of allowedFeatures) {
    if (query[feature]) {
      featureConditions[feature] = query[feature];
    }
  }

  return { conditions, featureConditions };
};

/**
 * Searches and filters properties with advanced options, including
 * sorting by distance, price, and other attributes.
 * @param {object} req - The request object with query parameters.
 * @param {object} res - The response object.
 */
exports.searchAndFilterProperties = async (req, res) => {
  try {
    const { conditions, featureConditions } = buildQueryConditions(req.query);
    const order = [];
    const attributes = { include: [] };

    // Set a default limit and offset for pagination
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    // An array to conditionally include the listings model
    const includeListings = [];

    // --- Dynamic Sorting Logic ---
    const lat = req.query.latitude;
    const lon = req.query.longitude;

    if (req.query.sort_by === 'distance' && lat && lon) {
      // Option 1: Sort by distance from a specified point.
      const earthRadiusMiles = 3959;
      // Add a calculated 'distance_miles' attribute to the select statement.
      attributes.include.push([
        literal(`${earthRadiusMiles} * acos(
          cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )`),
        'distance_miles',
      ]);
      // Sort the results using the calculated distance.
      order.push([literal('distance_miles'), req.query.sort_order || 'ASC']);
    } else if (req.query.sort_by === 'price') {
      // Option 2: Sort by price from the Listing model.
      order.push([{ model: Listing, as: 'listings' }, 'price', req.query.sort_order || 'DESC']);
      // A necessary inner join to make sure we only sort by listings that exist.
      includeListings.push({
        model: Listing,
        as: 'listings',
        attributes: ['price'],
        required: true,
      });
    } else {
      // Option 3 (Default): Sort by a standard property attribute.
      order.push([req.query.sort_by || 'created_at', req.query.sort_order || 'DESC']);
    }

    const properties = await Property.findAll({
      where: conditions,
      attributes,
      include: [
        ...includeListings, // Include listings if sorting by price
        {
          model: PropertyFeature,
          as: 'features',
          where: featureConditions,
          required: Object.keys(featureConditions).length > 0, // Only inner join if features are filtered
        },
        { model: PropertyPhoto, as: 'photos' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
      ],
      order,
      limit,
      offset,
      // Prevents Sequelize from creating a nested subquery for the ORDER BY clause,
      // which can cause issues with joined tables.
      subQuery: false,
    });

    if (properties.length === 0) {
      logger.info('No properties found matching the search criteria.');
    }

    res.status(200).json(properties);
  } catch (error) {
    logger.error('Error fetching properties with filters:', error);
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
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: PropertyFeature, as: 'features' },
        { model: PropertyPhoto, as: 'photos' },
        { model: db.Listing, as: 'listings' },
      ],
    });

    if (!property) {
      logger.warn(`Property with ID ${id} not found.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    res.status(200).json(property);

  } catch (error) {
    logger.error(`Error fetching property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves all properties (simple version, for backward compatibility).
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: PropertyFeature, as: 'features' },
        { model: PropertyPhoto, as: 'photos' },
      ],
      order: [['created_at', 'DESC']],
    });

    res.status(200).json(properties);
  } catch (error) {
    logger.error('Error fetching all properties:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Updates an existing property, including its features , in a single transaction.
 * Requires user admin role.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.updateProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { features, ...propertyData } = req.body;

    const property = await Property.findByPk(id, { transaction });
    if (!property) {
      await transaction.rollback();
      logger.warn(`Property with ID ${id} not found for update.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Check ownership: ensure the authenticated user owns this property .
    if (property.owner_id !== req.user.id ) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to update property ID ${id} by user ID ${req.user.id}.`);
      return res.status(403).json({ message: 'You are not authorized to update this property.' });
    }

    // Update latitude and longitude if the address fields have changed.
    if (propertyData.address || propertyData.city || propertyData.state || propertyData.zipcode) {
      const { latitude, longitude } = await getLatLongFromAddress(
        propertyData.address || property.address,
        propertyData.city || property.city,
        propertyData.state || property.state,
        propertyData.zipcode || property.zipcode
      );
      propertyData.latitude = latitude;
      propertyData.longitude = longitude;
    }

    await property.update(propertyData, { transaction });

    // Update or create features
    if (features) {
      const existingFeatures = await PropertyFeature.findOne({ where: { property_id: id } });
      if (existingFeatures) {
        await existingFeatures.update(features, { transaction });
      } else {
        await PropertyFeature.create({ ...features, property_id: id }, { transaction });
      }
    }

    await transaction.commit();
    logger.info(`Property with ID ${id} updated successfully by user ID ${req.user.id}.`);
    res.status(200).json({ message: 'Property updated successfully.', property });

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

    const photo = await PropertyPhoto.findByPk(photoId, {
      include: [{ model: Property, as: 'property' }],
      transaction
    });

    if (!photo) {
      await transaction.rollback();
      logger.warn(`Photo with ID ${photoId} not found.`);
      return res.status(404).json({ message: 'Photo not found.' });
    }

    // Security check: only the owner can delete a photo from their property.
    if (photo.property.owner_id !== req.user.id ) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to delete photo ID ${photoId} from property ID ${photo.property.id} by user ID ${req.user.id}.`);
      return res.status(403).json({ message: 'You are not authorized to delete this photo.' });
    }

    const wasPrimary = photo.is_primary;

    // Delete the photo from the file storage service.
    await deleteFile(photo.photo_url, 'photo');
    // Delete the photo record from the database.
    await photo.destroy({ transaction });

    // New logic: If the deleted photo was the primary one, assign a new primary.
    if (wasPrimary) {
      const remainingPhotos = await PropertyPhoto.findAll({
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
    logger.info(`Photo with ID ${photoId} deleted successfully by user ID ${req.user.id}.`);
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
 * Deletes a property and all its associated data (features, photos, listings) in a single transaction.
 * Requires user ownership or admin role.
 * @param {object} req - The request object.
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

    // Check ownership: ensure the authenticated user owns this property or is an admin.
    if (property.owner_id !== req.user.id ) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to delete property ID ${id} by user ID ${req.user.id}.`);
      return res.status(403).json({ message: 'You are not authorized to delete this property.' });
    }

    // Find and delete associated photos from Firebase first
    const photosToDelete = await PropertyPhoto.findAll({ where: { property_id: id }, transaction });
    await Promise.all(photosToDelete.map(photo => deleteFile(photo.photo_url, 'photo')));

    // Then, delete associated records from the database
    await PropertyFeature.destroy({ where: { property_id: id }, transaction });
    await PropertyPhoto.destroy({ where: { property_id: id }, transaction });
    await db.Listing.destroy({ where: { property_id: id }, transaction });

    // Finally, delete the property itself
    await property.destroy({ transaction });

    await transaction.commit();
    logger.info(`Property with ID ${id} deleted successfully by user ID ${req.user.id}.`);
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
    
    // Step 1: Check the current photo count for the property
    const photoCount = await PropertyPhoto.count({
      where: { property_id: propertyId },
      transaction,
    });

    if (photoCount >= 10) {
      await transaction.rollback();
      logger.warn(`Attempt to upload more than 10 photos for property ID ${propertyId}.`);
      return res.status(400).json({ message: 'Maximum of 10 photos allowed per property.' });
    }

    // Find the property to ensure it exists and to check ownership
    const property = await Property.findByPk(propertyId, { transaction });
    if (!property) {
      await transaction.rollback();
      logger.warn(`Property with ID ${propertyId} not found.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Security check: only the owner can add a photo to their property.
    if (property.owner_id !== req.user.id ) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to add a photo to property ID ${propertyId} by user ID ${req.user.id}.`);
      return res.status(403).json({ message: 'You are not authorized to add photos to this property.' });
    }

    // Upload the file to the storage service.
    const photoUrl = await uploadFile(req.file);

    // Create a database record for the new photo.
    const newPhoto = await PropertyPhoto.create({
      property_id: propertyId,
      photo_url: photoUrl,
      is_primary: false, // You might have logic to set this later.
    }, { transaction });

    await transaction.commit();
    logger.info(`Photo uploaded and linked to property ID ${propertyId} by user ID ${req.user.id}.`);
    res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
