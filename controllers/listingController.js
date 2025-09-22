const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const Company = db.Company;
const PropertyFeature = db.PropertyFeature;
const PropertyPhoto = db.PropertyPhoto;


// Create a new listing
exports.createListing = async (req, res) => {
    try {
        const { property_id, title, description, price, lease_expected_amount, deposit_expected_amount, status } = req.body;

        // Ensure user and company ID are available
        if (!req.user || !req.user.id || !req.user.company_id) {
            return res.status(401).json({ message: 'Authentication required or company not associated with user.' });
        }

        const listerId = req.user.id;
        const companyId = req.user.company_id;

        // Check if the property exists and belongs to the authenticated user's company
        const property = await Property.findOne({ where: { id: property_id, company_id: companyId } });
        if (!property) {
            return res.status(404).json({ message: 'Property not found or it does not belong to your company.' });
        }

        // Check if a listing for this property already exists
        const existingListing = await Listing.findOne({ where: { property_id } });
        if (existingListing) {
            return res.status(409).json({ message: 'A listing for this property already exists.' });
        }

        const newListing = await Listing.create({
            property_id,
            lister_id: listerId,
            company_id: companyId,
            title,
            description,
            price,
            lease_expected_amount,
            deposit_expected_amount,
            status,
        });

        logger.info(`New listing created by user ${listerId} for property ${property_id} and company ${companyId}`);
        res.status(201).json({ message: 'Listing created successfully.', listing: newListing });
    } catch (error) {
        logger.error('Error creating listing:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get all listings with search and filters
exports.searchListings = async (req, res) => {
    try {
        const {
            min_price,
            max_price,
            status,
            keywords,
            company_id,
            sort_by,
            sort_order,
            limit,
            offset,
        } = req.query;

        const whereClause = {};

        // Price filtering
        if (min_price) {
            whereClause.price = { [Op.gte]: parseFloat(min_price) };
        }
        if (max_price) {
            if (whereClause.price) {
                whereClause.price = { ...whereClause.price, [Op.lte]: parseFloat(max_price) };
            } else {
                whereClause.price = { [Op.lte]: parseFloat(max_price) };
            }
        }

        // Status filter
        if (status) {
            whereClause.status = status;
        }

        // Company filter
        if (company_id) {
            whereClause.company_id = company_id;
        }

        // Keyword search in title and description
        if (keywords) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keywords}%` } },
                { description: { [Op.like]: `%${keywords}%` } },
            ];
        }

        const orderClause = [];
        if (sort_by) {
            orderClause.push([sort_by, sort_order || 'ASC']);
        } else {
            // Default sort by created_at in descending order
            orderClause.push(['created_at', 'DESC']);
        }

        const listings = await Listing.findAll({
            where: whereClause,
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: ['photos'],
                },
            ],
            order: orderClause,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });

        res.status(200).json(listings);
    } catch (error) {
        logger.error('Error fetching listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get all listings
exports.getAllListings = async (req, res) => {
    try {
        const listings = await Listing.findAll({
            include: [
                { model: Property, as: 'property', include: ['photos', 'features'] },
                { model: User, as: 'lister', attributes: { exclude: ['password'] } },
                { model: Company, as: 'company' },
            ],
            order: [['created_at', 'DESC']],
        });
        res.status(200).json(listings);
    } catch (error) {
        logger.error('Error fetching listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get My listings
exports.getMyListings = async (req, res) => {
    try {
        if (!req.user || !req.user.company_id) {
            return res.status(403).json({ message: 'User is not associated with a company.' });
        }

        const companyId = req.user.company_id;

        const listings = await Listing.findAll({
            where: { company_id: companyId },
            include: [
                { model: Property, as: 'property', include: ['photos', 'features'] },
                { model: User, as: 'lister', attributes: { exclude: ['password'] } },
                { model: Company, as: 'company' },
            ],
            order: [['created_at', 'DESC']],
        });

        res.status(200).json(listings);
    } catch (error) {
        logger.error('Error fetching my listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get available properties for listing
exports.getAvailablePropertiesForListing = async (req, res) => {
    try {
        if (!req.user || !req.user.id || !req.user.company_id) {
            return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
        }

        const companyId = req.user.company_id;

        // Fetch properties owned by the user's company that are not already listed
        const properties = await Property.findAll({
            where: {
                company_id: companyId,
                id: {
                    [Op.notIn]: db.Sequelize.literal(`(SELECT property_id FROM listings)`),
                },
            }, include: [
                { model: Company, as: 'company', attributes: ['id', 'name'] },
                { model: PropertyFeature, as: 'features' },
                { model: PropertyPhoto, as: 'photos' },
            ]
        });

        res.status(200).json(properties);
    } catch (error) {
        logger.error('Error fetching available properties for listing:', error);
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
                { model: Company, as: 'company' },
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

        // Safely check for req.user and its properties
        if (!req.user || !req.user.id || !req.user.company_id) {
            return res.status(401).json({ message: 'Authentication required or company not associated with user.' });
        }

        const listerId = req.user.id;
        const listerCompanyId = req.user.company_id;

        const listing = await Listing.findOne({ where: { id } });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        // Check if the authenticated user is the lister and belongs to the same company
        const isAuthorized = listing.lister_id === listerId && listing.company_id === listerCompanyId;
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to update this listing.' });
        }

        // If property_id is being updated, check for duplicates
        if (req.body.property_id && req.body.property_id !== listing.property_id) {
            const existingListing = await Listing.findOne({
                where: {
                    property_id: req.body.property_id,
                    id: { [Op.ne]: id }
                }
            });
            if (existingListing) {
                return res.status(409).json({ message: 'A listing for this property already exists.' });
            }
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

        // Safely check for req.user and its properties
        if (!req.user || !req.user.id || !req.user.company_id) {
            return res.status(401).json({ message: 'Authentication required or company not associated with user.' });
        }

        const listerId = req.user.id;
        const listerCompanyId = req.user.company_id;

        const listing = await Listing.findOne({ where: { id } });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        // Check if the authenticated user is the lister and belongs to the same company
        const isAuthorized = listing.lister_id === listerId && listing.company_id === listerCompanyId;
        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this listing.' });
        }

        await listing.destroy();

        logger.info(`Listing ${id} deleted by user ${listerId}`);
        res.status(200).json({ message: 'Listing deleted successfully.' });
    } catch (error) {
        logger.error(`Error deleting listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
