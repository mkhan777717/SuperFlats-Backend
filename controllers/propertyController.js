const db = require('../models');
const logger = require('../utils/logger');
const { createPropertySchema } = require('../utils/validator');
const Property = db.Property;
const PropertyFeature = db.PropertyFeature;
const PropertyPhoto = db.PropertyPhoto;
const User = db.User;

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

    // Get the owner_id securely from the authenticated user's token
    const owner_id = req.user.id;
    const { title, description, property_type, address, city, state, zipcode, features, photos } = req.body;

    // Create the property within the transaction
    const newProperty = await Property.create({
      owner_id,
      title,
      description,
      property_type,
      address,
      city,
      state,
      zipcode,
    }, { transaction });

    // Create associated features and photos within the same transaction
    if (features) {
      await PropertyFeature.create({
        property_id: newProperty.id,
        ...features,
      }, { transaction });
    }

    if (photos && photos.length > 0) {
      const propertyPhotos = photos.map(photo => ({
        property_id: newProperty.id,
        photo_url: photo.photo_url,
        is_primary: photo.is_primary || false,
      }));
      await PropertyPhoto.bulkCreate(propertyPhotos, { transaction });
    }
    
    // Commit the transaction
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

// Get a single property by ID with all its details
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] }, // Changed 'username' to 'name'
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

// Get all properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] }, // Changed 'username' to 'name'
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
    const { features, photos, ...propertyData } = req.body;

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

    // Update or create photos
    if (photos && photos.length > 0) {
      // For simplicity, we'll delete existing photos and re-create.
      // A more robust solution would involve selective updates.
      await PropertyPhoto.destroy({ where: { property_id: id }, transaction });
      const propertyPhotos = photos.map(photo => ({
        property_id: id,
        photo_url: photo.photo_url,
        is_primary: photo.is_primary || false,
      }));
      await PropertyPhoto.bulkCreate(propertyPhotos, { transaction });
    }
    
    await transaction.commit();
    logger.info(`Property with ID ${id} updated successfully.`);
    res.status(200).json({ message: 'Property updated successfully.', property });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
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

    // Delete associated records first due to foreign key constraints
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
