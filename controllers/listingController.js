const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const GroupedListing = db.GroupedListing;
const GroupedListingItem = db.GroupedListingItem;

// Create a new listing
exports.createListing = async (req, res) => {
    try {
        const { property_id, title, description, price, lease_expected_amount, deposit_expected_amount, status } = req.body;
        const listerId = req.user.id; // Get lister ID from authenticated user

        // Check if the property exists and belongs to the authenticated user
        const property = await Property.findOne({ where: { id: property_id, owner_id: listerId } });
        if (!property) {
            return res.status(404).json({ message: 'Property not found or you are not the owner.' });
        }

        const newListing = await Listing.create({
            property_id,
            lister_id: listerId,
            title,
            description,
            price,
            lease_expected_amount,
            deposit_expected_amount,
            status,
        });

        logger.info(`New listing created by user ${listerId} for property ${property_id}`);
        res.status(201).json({ message: 'Listing created successfully.', listing: newListing });
    } catch (error) {
        logger.error('Error creating listing:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get all listings
exports.getAllListings = async (req, res) => {
    try {
        const listings = await Listing.findAll({
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: ['photos'], // Include associated photos
                },
            ],
            order: [['created_at', 'DESC']],
        });
        res.status(200).json(listings);
    } catch (error) {
        logger.error('Error fetching listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get a single listing by ID
exports.getListingById = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findByPk(id, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: ['photos'],
                },
                {
                    model: User,
                    as: 'lister',
                    attributes: { exclude: ['password'] },
                },
            ],
        });

        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        res.status(200).json(listing);
    } catch (error) {
        logger.error(`Error fetching listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Update a listing
exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listerId = req.user.id;

        const listing = await Listing.findOne({ where: { id, lister_id: listerId } });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found or you are not the lister.' });
        }

        await listing.update(req.body);

        logger.info(`Listing ${id} updated by user ${listerId}`);
        res.status(200).json({ message: 'Listing updated successfully.', listing });
    } catch (error) {
        logger.error(`Error updating listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Delete a listing
exports.deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listerId = req.user.id;

        const result = await Listing.destroy({
            where: { id, lister_id: listerId },
        });

        if (result === 0) {
            return res.status(404).json({ message: 'Listing not found or you are not the lister.' });
        }

        logger.info(`Listing ${id} deleted by user ${listerId}`);
        res.status(200).json({ message: 'Listing deleted successfully.' });
    } catch (error) {
        logger.error(`Error deleting listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
