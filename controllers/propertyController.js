// controllers/propertyController.js

const db = require('../models');
const logger = require('../utils/logger');
const { createPropertySchema, validate } = require('../utils/validator');
const Property = db.Property;
const PropertyFeature = db.PropertyFeature;
const PropertyPhoto = db.PropertyPhoto;
const User = db.User;

// Create a new property
exports.createProperty = async (req, res) => {
  try {
    const { owner_id, title, description, property_type, address, city, state, country, zipcode, features, photos } = req.body;

    // Validate request body
    const { error } = createPropertySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if the owner exists
    const owner = await User.findByPk(owner_id);
    if (!owner || owner.role !== 'owner') {
      return res.status(404).json({ message: 'Owner not found or does not have the correct role.' });
    }

    // Create the property
    const newProperty = await Property.create({
      owner_id,
      title,
      description,
      property_type,
      address,
      city,
      state,
      country,
      zipcode,
    });

    // Create associated features and photos
    if (features) {
      await PropertyFeature.create({
        property_id: newProperty.id,
        ...features,
      });
    }

    if (photos && photos.length > 0) {
      const propertyPhotos = photos.map(photo => ({
        property_id: newProperty.id,
        photo_url: photo.photo_url,
        is_primary: photo.is_primary || false,
      }));
      await PropertyPhoto.bulkCreate(propertyPhotos);
    }
    
    logger.info(`New property created with ID: ${newProperty.id}`);
    res.status(201).json({ message: 'Property created successfully.', property: newProperty });

  } catch (error) {
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
        { model: User, as: 'owner', attributes: ['id', 'username', 'email'] },
        { model: PropertyFeature, as: 'features' },
        { model: PropertyPhoto, as: 'photos' },
        { model: db.Listing, as: 'listings' },
      ],
    });

    if (!property) {
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
        { model: User, as: 'owner', attributes: ['id', 'username', 'email'] },
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
  try {
    const { id } = req.params;
    const { features, photos, ...propertyData } = req.body;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    await property.update(propertyData);

    // Update or create features
    if (features) {
      const existingFeatures = await PropertyFeature.findOne({ where: { property_id: id } });
      if (existingFeatures) {
        await existingFeatures.update(features);
      } else {
        await PropertyFeature.create({ ...features, property_id: id });
      }
    }

    // Update or create photos
    if (photos && photos.length > 0) {
      // For simplicity, we'll delete existing photos and re-create.
      // A more robust solution would involve selective updates.
      await PropertyPhoto.destroy({ where: { property_id: id } });
      const propertyPhotos = photos.map(photo => ({
        property_id: id,
        photo_url: photo.photo_url,
        is_primary: photo.is_primary || false,
      }));
      await PropertyPhoto.bulkCreate(propertyPhotos);
    }

    logger.info(`Property with ID ${id} updated successfully.`);
    res.status(200).json({ message: 'Property updated successfully.', property });

  } catch (error) {
    logger.error(`Error updating property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Delete a property
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Delete associated records first due to foreign key constraints
    await PropertyFeature.destroy({ where: { property_id: id } });
    await PropertyPhoto.destroy({ where: { property_id: id } });
    await db.Listing.destroy({ where: { property_id: id } });

    await property.destroy();

    logger.info(`Property with ID ${id} deleted successfully.`);
    res.status(200).json({ message: 'Property and its associated data deleted successfully.' });

  } catch (error) {
    logger.error(`Error deleting property with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};