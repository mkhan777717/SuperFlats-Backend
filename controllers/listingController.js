const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { createListingSchema, updateListingSchema } = require('../utils/validator');
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const Company = db.Company;
const Flat = db.Flat;
const Photo = db.Photo;


/**
 * Provides a public-facing search for all active listings with comprehensive filters.
 */
exports.publicSearchListings = async (req, res) => {
    try {
        const {
            keywords,
            city,
            min_rent,
            max_rent,
            type,
            sort_by,
            sortBy,
            sortOrder,
            limit = 12,
            offset = 0,
        } = req.query;

        // --- Build Where Clauses ---
        const listingWhere = { status: 'active' }; // Core requirement: only active listings
        const propertyWhere = {};
        const flatWhere = {};

        // Rent filter
        if (min_rent || max_rent) {
            listingWhere.monthly_rent = {};
            if (min_rent) listingWhere.monthly_rent[Op.gte] = parseFloat(min_rent);
            if (max_rent) listingWhere.monthly_rent[Op.lte] = parseFloat(max_rent);
        }

        // Location filter
        if (city) {
            propertyWhere.city = { [Op.like]: `%${city}%` };
        }

        // Flat type filter
        if (type) {
            flatWhere.type = type;
        }

        // Keyword search across multiple fields
        if (keywords) {
            const keywordQuery = { [Op.like]: `%${keywords}%` };
            listingWhere[Op.or] = [
                { title: keywordQuery },
                { description: keywordQuery },
                { '$flat.property.name$': keywordQuery },
                { '$flat.property.address$': keywordQuery },
                { '$flat.property.city$': keywordQuery },
            ];
        }

        // --- Sorting ---
        const validSortColumns = ['created_at', 'monthly_rent'];
        const reqSortBy = sort_by || sortBy || 'created_at'; // Use whichever is provided, default to created_at
        const reqSortOrder = sortOrder || sortOrder || 'DESC';
        const finalSortBy = validSortColumns.includes(reqSortBy) ? reqSortBy : 'created_at';
        const finalSortOrder = reqSortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const order = finalSortBy === 'monthly_rent'
            ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
            : [[finalSortBy, finalSortOrder]];

        // --- Database Query ---
        const { count, rows } = await Listing.findAndCountAll({
            where: listingWhere,
            include: [
                {
                    model: Flat,
                    as: 'flat',
                    required: true,
                    where: flatWhere,
                    attributes: ['id', 'type', 'area_sqft', 'unit_number'],
                    include: [
                        {
                            model: Property,
                            as: 'property',
                            required: true,
                            where: propertyWhere,
                            attributes: ['id', 'name', 'city', 'address'],
                        },
                        {
                            model: Photo,
                            as: 'photos',
                            attributes: ['id', 'photo_url', 'is_primary'],
                            separate: true,
                            order: [['is_primary', 'DESC']],
                        },
                    ],
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name'],
                },
            ],
            order,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            distinct: true,
            subQuery: false,
        });

        res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Math.floor(offset / limit) + 1,
            listings: rows,
        });
    } catch (error) {
        logger.error('Error in public listing search:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// Create a new listing for a flat
exports.createListing = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { error } = createListingSchema.validate(req.body);
        if (error) {
            await transaction.rollback();
            return res.status(400).json({ message: error.details[0].message });
        }

        const { flat_id, title, description, monthly_rent, security_amount, security_type, status } = req.body;

        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const lister_id = req.user.id;
        const company_id = req.user.employee.company_id;

        const flat = await Flat.findOne({ where: { id: flat_id, company_id: company_id }, transaction });
        if (!flat) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Flat not found or it does not belong to your company.' });
        }

        const existingListing = await Listing.findOne({ where: { flat_id }, transaction });
        if (existingListing) {
            await transaction.rollback();
            return res.status(409).json({ message: 'A listing for this flat already exists.' });
        }

        const newListing = await Listing.create({
            flat_id,
            lister_id,
            company_id,
            title,
            description,
            monthly_rent,
            security_amount,
            security_type,
            status,
        }, { transaction });

        await transaction.commit();
        logger.info(`New listing created by user ${lister_id} for flat ${flat_id}`);
        res.status(201).json({ message: 'Listing created successfully.', listing: newListing });
    } catch (error) {
        if (transaction.finished !== 'commit') await transaction.rollback();
        logger.error('Error creating listing:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// Get all listings for the authenticated user's company
exports.getMyListings = async (req, res) => {
    try {
        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(403).json({ message: 'User is not associated with a company.' });
        }

        const company_id = req.user.employee.company_id;
        const {
            keywords,
            sort_by,
            sortBy,
            sortOrder,
            limit = 10,
            offset = 0
        } = req.query;

        // --- Build Where Clause ---
        const whereClause = { company_id };

        if (keywords) {
            const keywordQuery = { [Op.like]: `%${keywords}%` };
            whereClause[Op.or] = [
                { title: keywordQuery },
                { '$flat.unit_number$': keywordQuery },
                { '$flat.property.name$': keywordQuery },
            ];
        }

        // --- Build Order Clause ---
        const validSortColumns = ['created_at', 'monthly_rent'];
        const reqSortBy = sort_by || sortBy || 'created_at'; // Use whichever is provided, default to created_at
        const reqSortOrder = sortOrder || sortOrder || 'DESC';
        const finalSortBy = validSortColumns.includes(reqSortBy) ? reqSortBy : 'created_at';
        const finalSortOrder = reqSortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const order = finalSortBy === 'monthly_rent'
            ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
            : [[finalSortBy, finalSortOrder]];

        const { count, rows } = await Listing.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Flat,
                    as: 'flat',
                    required: true,
                    include: [
                        { model: Property, as: 'property', attributes: ['id', 'name'], required: true },
                        { model: Photo, as: 'photos', where: { is_primary: true }, required: false }
                    ]
                },
                { model: User, as: 'lister', attributes: ['id', 'name'] },
            ],
            order,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            distinct: true,
            subQuery: false,
        });

        res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Math.floor(offset / limit) + 1,
            listings: rows,
        });
    } catch (error) {
        logger.error('Error fetching my listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Get all listings for a specific property, with search, sort, and pagination.
 */
exports.getListingsByProperty = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const company_id = req.user.employee.company_id;

        if (!company_id) {
            return res.status(403).json({ message: 'User is not associated with a company.' });
        }

        // Authorization: Check if the property exists and belongs to the user's company
        const property = await Property.findOne({ where: { id: propertyId, company_id } });
        if (!property) {
            return res.status(404).json({ message: 'Property not found or you are not authorized to view its listings.' });
        }

        const {
            keywords,
            sort_by,
            sortBy,
            sortOrder,
            limit = 10,
            offset = 0
        } = req.query;

        const whereClause = { company_id };
        const flatWhereClause = { property_id: propertyId };

        if (keywords) {
            const keywordQuery = { [Op.like]: `%${keywords}%` };
            whereClause[Op.or] = [
                { title: keywordQuery },
                { '$flat.unit_number$': keywordQuery },
            ];
        }

        const validSortColumns = ['created_at', 'monthly_rent'];
        const reqSortBy = sort_by || sortBy || 'created_at';
        const reqSortOrder = sortOrder || sortOrder || 'DESC';
        const finalSortBy = validSortColumns.includes(reqSortBy) ? reqSortBy : 'created_at';
        const finalSortOrder = reqSortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const order = finalSortBy === 'monthly_rent'
            ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
            : [[finalSortBy, finalSortOrder]];

        const { count, rows } = await Listing.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Flat,
                    as: 'flat',
                    where: flatWhereClause,
                    required: true,
                    include: [
                        { model: Property, as: 'property', attributes: ['id', 'name'], required: true },
                        { model: Photo, as: 'photos', where: { is_primary: true }, required: false }
                    ]
                },
                { model: User, as: 'lister', attributes: ['id', 'name'] },
            ],
            order,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            distinct: true,
            subQuery: false,
        });

        res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Math.floor(offset / limit) + 1,
            listings: rows,
        });

    } catch (error) {
        logger.error(`Error fetching listings for property ${req.params.propertyId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// Get available flats for listing for a specific property
exports.getAvailableFlatsForListing = async (req, res) => {
    try {
        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const company_id = req.user.employee.company_id;
        const { propertyId } = req.params; // Get propertyId from route params

        // Authorization check: Ensure the property belongs to the user's company
        const property = await Property.findOne({ where: { id: propertyId, company_id } });
        if (!property) {
            return res.status(404).json({ message: 'Property not found or does not belong to your company.' });
        }

        const availableFlats = await Flat.findAll({
            where: {
                company_id: company_id,
                property_id: propertyId,
                id: {
                    [Op.notIn]: db.sequelize.literal(`(SELECT flat_id FROM listings WHERE company_id = ${company_id})`),
                },
                flatStatus: 'available',
            },
            include: [
                { model: Property, as: 'property', attributes: ['id', 'name', 'address'] },
            ],
            order: [['id', 'DESC']]
        });

        res.status(200).json(availableFlats);
    } catch (error) {
        logger.error('Error fetching available flats for listing:', error);
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
                    model: Flat,
                    as: 'flat',
                    include: [
                        { model: Property, as: 'property' },
                        { model: Photo, as: 'photos' }
                    ]
                },
                { model: User, as: 'lister', attributes: { exclude: ['password'] } },
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
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { error } = updateListingSchema.validate(req.body);
        if (error) {
            await transaction.rollback();
            return res.status(400).json({ message: error.details[0].message });
        }

        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const lister_id = req.user.id;
        const company_id = req.user.employee.company_id;

        const listing = await Listing.findByPk(id, { transaction });
        if (!listing) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Listing not found.' });
        }

        if (listing.company_id !== company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Forbidden: You do not have permission to update this listing.' });
        }

        await listing.update(req.body, { transaction });
        await transaction.commit();

        logger.info(`Listing ${id} updated by user ${lister_id}`);
        res.status(200).json({ message: 'Listing updated successfully.', listing });
    } catch (error) {
        if (transaction.finished !== 'commit') await transaction.rollback();
        logger.error(`Error updating listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Delete a listing
exports.deleteListing = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;

        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const lister_id = req.user.id;
        const company_id = req.user.employee.company_id;

        const listing = await Listing.findByPk(id, { transaction });
        if (!listing) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Listing not found.' });
        }

        if (listing.company_id !== company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this listing.' });
        }

        await listing.destroy({ transaction });
        await transaction.commit();

        logger.info(`Listing ${id} deleted by user ${lister_id}`);
        res.status(200).json({ message: 'Listing deleted successfully.' });
    } catch (error) {
        if (transaction.finished !== 'commit') await transaction.rollback();
        logger.error(`Error deleting listing ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
