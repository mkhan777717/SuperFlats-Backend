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

// Helper function to get Lat/Long from an address using a geocoding service
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
        'User-Agent': 'SuperFlatsApp/1.0 (contact@example.com)' // Required by Nominatim
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

// Create a new property
exports.createProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    // Validate request body
    const { error } = createPropertySchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during property creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    // Ensure at least one photo is uploaded
    const photos = req.files?.photos;
    if (!photos || photos.length === 0) {
      await transaction.rollback();
      logger.warn('No photos provided for property creation.');
      return res.status(400).json({ message: 'At least one photo is required.' });
    }

    // Get the owner_id securely from the authenticated user's token
    const owner_id = req.user.id;
    const { title, description, property_type, address, city, state, zipcode, features } = req.body;

    // Get latitude and longitude from the address
    const { latitude, longitude } = await getLatLongFromAddress(address, city, state, zipcode);

    // STEP 1: Create the property within the transaction
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
    }, { transaction });

    // Create associated features
    if (features) {
      await PropertyFeature.create({
        property_id: newProperty.id,
        ...features,
      }, { transaction });
    }

    // STEP 2: Upload all photos and create database records
    const propertyPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const photoFile = photos[i];
      const photoUrl = await uploadFile(photoFile);
      propertyPhotos.push({
        property_id: newProperty.id,
        photo_url: photoUrl,
        is_primary: i === 0, // Set the first photo as primary
      });
    }

    await PropertyPhoto.bulkCreate(propertyPhotos, { transaction });

    // STEP 3: Commit the transaction
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

// Helper function to build dynamic queries
const buildQueryConditions = (query) => {
  const conditions = {};
  const featureConditions = {};
  const allowedFeatures = ['bedrooms', 'bathrooms', 'area_sqft', 'furnishing', 'parking', 'amenities'];

  if (query.city) {
    conditions.city = { [Op.iLike]: `%${query.city}%` };
  }
  if (query.state) {
    conditions.state = { [Op.iLike]: `%${query.state}%` };
  }
  if (query.zipcode) {
    conditions.zipcode = query.zipcode;
  }
  if (query.type) {
    conditions.property_type = { [Op.iLike]: `%${query.type}%` };
  }
  if (query.search) {
    conditions[Op.or] = [
      { title: { [Op.iLike]: `%${query.search}%` } },
      { description: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  // Handle proximity search with latitude, longitude, and radius
  if (query.latitude && query.longitude && query.radius) {
    const lat = parseFloat(query.latitude);
    const lon = parseFloat(query.longitude);
    const radius = parseFloat(query.radius);
    const earthRadiusMiles = 3959; // Radius of the earth in miles
    const earthRadiusKm = 6371; // Radius of the earth in kilometers

    // Use a literal to perform the Haversine formula calculation in SQL
    // This is much more efficient than fetching all properties and filtering in code
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

// Get all properties with filtering, sorting, and searching capabilities
exports.searchAndFilterProperties = async (req, res) => {
  try {
    const { conditions, featureConditions } = buildQueryConditions(req.query);
    const order = [];
    const attributes = { include: [] };

    // --- Sorting Options ---
    // The `sort_by` query parameter determines how the results are ordered.
    // The `sort_order` can be `ASC` (default) or `DESC`.

    // Option 1: Sort by distance from a given point.
    // This is a special sorting option that uses the Haversine formula.
    // It requires `latitude`, `longitude`, and `radius` to be present in the query.
    // `sort_by=distance`
    const lat = req.query.latitude;
    const lon = req.query.longitude;
    if (req.query.sort_by === 'distance' && lat && lon) {
      const earthRadiusMiles = 3959;
      // Add the distance calculation as a selected attribute. The result is aliased as `distance_miles`.
      attributes.include.push([
        literal(`${earthRadiusMiles} * acos(
          cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )`),
        'distance_miles',
      ]);
      // Use the newly created `distance_miles` attribute for sorting.
      order.push([literal('distance_miles'), req.query.sort_order || 'ASC']);
    } else {
      // Option 2 (Default): Sort by any other column, such as `created_at`.
      // `sort_by=created_at`
      // You can also use other columns like `title`, `property_type`, etc.
      order.push([req.query.sort_by || 'created_at', req.query.sort_order || 'DESC']);
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const properties = await Property.findAll({
      where: conditions,
      attributes,
      include: [
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

// Get a single property by ID with all its details
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

// Get all properties (simple version, for backward compatibility)
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

// Update a property
exports.updateProperty = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const { features, ...propertyData } = req.body;
    const newPhotos = req.files?.photos;

    const property = await Property.findByPk(id, { transaction });
    if (!property) {
      await transaction.rollback();
      logger.warn(`Property with ID ${id} not found for update.`);
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Check ownership
    if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to update property ID ${id} by user ID ${req.user.id}.`);
      return res.status(403).json({ message: 'You are not authorized to update this property.' });
    }

    // Get latitude and longitude from the address if it's being updated
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

    // Handle photo updates only if new photos are provided
    if (newPhotos && newPhotos.length > 0) {
      // Find existing photos and delete them from both Firebase and the database
      const existingPhotos = await PropertyPhoto.findAll({ where: { property_id: id }, transaction });
      await Promise.all(existingPhotos.map(photo => deleteFile(photo.photo_url, 'photo')));
      await PropertyPhoto.destroy({ where: { property_id: id }, transaction });

      // Upload and save the new photos
      const propertyPhotos = [];
      for (let i = 0; i < newPhotos.length; i++) {
        const photoFile = newPhotos[i];
        const photoUrl = await uploadFile(photoFile);
        propertyPhotos.push({
          property_id: id,
          photo_url: photoUrl,
          is_primary: i === 0, // Set the first photo as primary
        });
      }
      await PropertyPhoto.bulkCreate(propertyPhotos, { transaction });
    }

    await transaction.commit();
    logger.info(`Property with ID ${id} updated successfully.`);
    res.status(200).json({ message: 'Property updated successfully.', property });

  } catch (error) {
    await transaction.rollback();
    logger.error(`Error updating property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Delete a property
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

    // Check ownership
    if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
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

    await property.destroy({ transaction });

    await transaction.commit();
    logger.info(`Property with ID ${id} deleted successfully.`);
    res.status(200).json({ message: 'Property and its associated data deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error deleting property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Handles the file upload and returns the URL
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const photoUrl = await uploadFile(req.file);

    res.status(201).json({ message: 'Image uploaded successfully.', photo_url: photoUrl });

  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
