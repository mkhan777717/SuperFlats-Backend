const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const GroupedListing = db.GroupedListing;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;

/**
 * Creates a new grouped listing and associates listings with it.
 * It uses a transaction to ensure all operations are atomic.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.createGroupedListing = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { name, description, listing_ids } = req.body;

        if (!name || !listing_ids || listing_ids.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Name and at least one listing ID are required.' });
        }

        // CRITICAL VALIDATION: Check if all listing IDs exist before creating associations
        const existingListings = await Listing.findAll({
            where: {
                id: {
                    [Op.in]: listing_ids
                }
            }
        });

        if (existingListings.length !== listing_ids.length) {
            await transaction.rollback();
            const foundIds = existingListings.map(l => l.id);
            const notFoundIds = listing_ids.filter(id => !foundIds.includes(id));
            logger.warn(`Attempt to create grouped listing with non-existent listing IDs: ${notFoundIds.join(', ')}`);
            return res.status(400).json({ message: `One or more listing IDs were not found: ${notFoundIds.join(', ')}` });
        }

        // --- NEW VALIDATION: Check for existing grouped listing with the same listings
        const existingGroupedListing = await db.GroupedListingItem.findOne({
            attributes: ['group_id'],
            where: {
                listing_id: { [Op.in]: listing_ids }
            },
            group: ['group_id'],
            having: db.sequelize.literal(`COUNT(DISTINCT listing_id) = ${listing_ids.length}`)
        });

        if (existingGroupedListing) {
            await transaction.rollback();
            logger.warn(`Attempt to create a duplicate grouped listing.`);
            return res.status(409).json({ message: 'A grouped listing with these exact listings already exists.' });
        }
        // --- END OF NEW VALIDATION ---

        // Ensure no two listings point to the same property
        const propertyIds = new Set();
        for (const listing of existingListings) {
            if (propertyIds.has(listing.property_id)) {
                await transaction.rollback();
                return res.status(400).json({ message: 'A single property cannot be added more than once to a grouped listing.' });
            }
            propertyIds.add(listing.property_id);
        }

        // 1. Create the new grouped listing
        const newGroup = await GroupedListing.create({
            name,
            description,
        }, { transaction });

        // 2. Add listings to the grouped listing
        const listingsToAdd = existingListings.map(listing => ({
            group_id: newGroup.id,
            listing_id: listing.id,
        }));
        await db.GroupedListingItem.bulkCreate(listingsToAdd, { transaction });

        await transaction.commit();
        logger.info(`New grouped listing "${name}" created with ID ${newGroup.id}`);
        res.status(201).json({ message: 'Grouped listing created successfully.', grouped_listing: newGroup });
    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error('Error creating grouped listing:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves all grouped listings, including their associated listings.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllGroupedListings = async (req, res) => {
    try {
        const groupedListings = await GroupedListing.findAll({
            include: [{
                model: Listing,
                as: 'listings',
                through: { attributes: [] }, // Exclude the join table attributes
                include: [
                    { model: Property, as: 'property', include: ['photos'] },
                    { model: User, as: 'lister', attributes: { exclude: ['password'] } }
                ]
            }],
        });

        res.status(200).json(groupedListings);
    } catch (error) {
        logger.error('Error fetching grouped listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a single grouped listing by its ID.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getGroupedListingById = async (req, res) => {
    try {
        const { id } = req.params;
        const groupedListing = await GroupedListing.findByPk(id, {
            include: [{
                model: Listing,
                as: 'listings',
                through: { attributes: [] },
                include: [
                    { model: Property, as: 'property', include: ['photos'] },
                    { model: User, as: 'lister', attributes: { exclude: ['password'] } }
                ]
            }],
        });

        if (!groupedListing) {
            return res.status(404).json({ message: 'Grouped listing not found.' });
        }

        res.status(200).json(groupedListing);
    } catch (error) {
        logger.error(`Error fetching grouped listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Updates a grouped listing's name, description, and associated listings.
 * It removes all old associations and creates new ones in a single transaction.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.updateGroupedListing = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { name, description, listing_ids } = req.body;

        const groupedListing = await GroupedListing.findByPk(id, { transaction });
        if (!groupedListing) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Grouped listing not found.' });
        }

        // CRITICAL VALIDATION: Check if all listing IDs exist before creating associations
        if (listing_ids && listing_ids.length > 0) {
            const listings = await Listing.findAll({ where: { id: { [Op.in]: listing_ids } }, transaction });
            if (listings.length !== listing_ids.length) {
                await transaction.rollback();
                const foundIds = listings.map(l => l.id);
                const notFoundIds = listing_ids.filter(id => !foundIds.includes(id));
                return res.status(400).json({ message: `One or more listing IDs were not found: ${notFoundIds.join(', ')}` });
            }
            
            // --- NEW VALIDATION ---
            // Ensure no two listings point to the same property
            const propertyIds = new Set();
            for (const listing of listings) {
                if (propertyIds.has(listing.property_id)) {
                    await transaction.rollback();
                    return res.status(400).json({ message: 'A single property cannot be added more than once to a grouped listing.' });
                }
                propertyIds.add(listing.property_id);
            }
            // --- END OF NEW VALIDATION ---

            // 1. Update the group's name and description
            await groupedListing.update({ name, description }, { transaction });
    
            // 2. Remove old associations and add new ones
            await groupedListing.setListings(listings, { transaction });

        } else {
             // If listing_ids are empty, remove all associations
             await groupedListing.setListings([], { transaction });
        }

        await transaction.commit();
        logger.info(`Grouped listing ${id} updated.`);
        res.status(200).json({ message: 'Grouped listing updated successfully.', grouped_listing: groupedListing });
    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error updating grouped listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Deletes a grouped listing.
 * Because of the `onDelete: CASCADE` in the model, associated items will also be deleted.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.deleteGroupedListing = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await GroupedListing.destroy({
            where: { id },
        });

        if (result === 0) {
            return res.status(404).json({ message: 'Grouped listing not found.' });
        }

        logger.info(`Grouped listing ${id} deleted.`);
        res.status(200).json({ message: 'Grouped listing deleted successfully.' });
    } catch (error) {
        logger.error(`Error deleting grouped listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
