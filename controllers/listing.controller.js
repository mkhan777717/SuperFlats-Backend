const db = require('../models');
const logger = require('../utils/logger');
const { Op, where } = require('sequelize');
const { createListingSchema, updateListingSchema } = require('../utils/validator');
const { required } = require('joi');
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const Company = db.Company;
const Flat = db.Flat;
const Photo = db.Photo;


const getBounds = (lat, lng, radiusKm) => {
    const latDelta = radiusKm / 111.045; // 1 degree of latitude ~ 111.045 km
    const lngDelta = radiusKm / (111.320 * Math.cos(lat * (Math.PI / 180))); // 1 degree of longitude varies by latitude

    return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLng: lng - lngDelta,
        maxLng: lng + lngDelta,
    };
};

/**
 * Provides a public-facing search for all active listings with comprehensive filters,
 * including keywords, city, price, type, and landmarks.
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
            landmark_coords, // NEW: Landmark coordinates and radius
        } = req.query;
        let finalType = type;
        if (type == '3BHK_PLUS') {
            finalType = '3BHK+';
        }
        const listingWhere = { status: 'active' };
        const propertyWhere = {};
        const flatWhere = {};

        // -------------------------
        // 1. PRICE FILTER
        // -------------------------
        if (min_rent || max_rent) {
            listingWhere.monthly_rent = {};
            if (min_rent) listingWhere.monthly_rent[Op.gte] = parseFloat(min_rent);
            if (max_rent) listingWhere.monthly_rent[Op.lte] = parseFloat(max_rent);
        }

        // -------------------------
        // 2. CITY FILTER
        // -------------------------
        if (city) {
            propertyWhere.city = { [Op.like]: `%${city}%` };
        }

        // -------------------------
        // 3. PROPERTY TYPE FILTER
        // -------------------------
        if (finalType) {
            flatWhere.type = finalType;
        }

        // -------------------------
        // 4. LANDMARK SEARCH (GEOSPATIAL FILTER) - NEW LOGIC
        // -------------------------
        if (landmark_coords) {
            try {
                const coords = JSON.parse(landmark_coords);
                const landmarkConditions = coords.map(coord => {
                    const { lat, lng, radius_km } = coord;
                    if (!lat || !lng || !radius_km) return null;

                    const bounds = getBounds(parseFloat(lat), parseFloat(lng), parseFloat(radius_km));

                    // FIX: Define the latitude and longitude conditions explicitly.
                    // Sequelize will then correctly map these column names to the 'flat->property' alias 
                    // and apply them correctly, likely in the main WHERE clause.
                    return {
                        latitude: { [Op.between]: [bounds.minLat, bounds.maxLat] },
                        longitude: { [Op.between]: [bounds.minLng, bounds.maxLng] },
                    };
                }).filter(c => c !== null);

                if (landmarkConditions.length > 0) {
                    // Combine all landmark conditions using OR, so the property must be near AT LEAST ONE landmark.
                    // Each item in landmarkConditions is implicitly ANDed (latitude AND longitude).
                    // This entire array is then ORed.
                    propertyWhere[Op.or] = landmarkConditions;
                }

                // ... (rest of the logic for clearing propertyWhere.city remains)
                if (propertyWhere[Op.or]) {
                      propertyWhere.city;
                }

            } catch (e) {
                logger.warn('Failed to parse landmark_coords:', e);
            }
        }

        // -------------------------
        // 5. KEYWORD SEARCH
        // -------------------------
        if (keywords) {
            const keywordQuery = { [Op.like]: `%${keywords}%` };
            // Note: Sequelize allows using Op.or inside listingWhere to search on associations
            listingWhere[Op.or] = [
                { title: keywordQuery },
                { description: keywordQuery },
                { '$flat.property.name$': keywordQuery },
                { '$flat.property.address$': keywordQuery },
                { '$flat.property.city$': keywordQuery },
            ];
        }

        // -------------------------
        // 6. SORTING AND PAGINATION
        // -------------------------
        const validSortColumns = ['created_at', 'monthly_rent'];
        const reqSortBy = sort_by || sortBy || 'created_at';
        const reqSortOrder = sortOrder || 'DESC';
        const finalSortBy = validSortColumns.includes(reqSortBy) ? reqSortBy : 'created_at';
        const finalSortOrder = reqSortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const order = finalSortBy === 'monthly_rent'
            ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
            : [[finalSortBy, finalSortOrder]];

        // -------------------------
        // 7. EXECUTE QUERY
        // -------------------------
        const { count, rows } = await Listing.findAndCountAll({
            where: listingWhere,
            include: [
                {
                    model: Flat,
                    as: 'flat',
                    required: true,
                    where: flatWhere,

                    include: [
                        {
                            model: Property,
                            as: 'property',
                            required: true,
                            where: propertyWhere, // Property filtering applied here
                            // Make sure 'latitude' and 'longitude' are in your Property model

                        },
                        {
                            model: Photo,
                            as: 'photos',
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
                {
                    model: User,
                    as: 'lister',
                    attributes: ['profile_image', 'name', 'id'],
                },
            ],
            order,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            distinct: true,
            subQuery: false,
        });

        // -------------------------
        // 8. RESPONSE
        // -------------------------
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

        const whereClause = { company_id };

        if (keywords) {
            const keywordQuery = { [Op.like]: `%${keywords}%` };
            whereClause[Op.or] = [
                { title: keywordQuery },
                { '$flat.unit_number$': keywordQuery },
                { '$flat.property.name$': keywordQuery },
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
                        { model: Property, as: 'property', required: true },
                        { model: Photo, as: 'photos', where: { is_primary: true }, required: false }
                    ]
                },
                { model: User, as: 'lister' },
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
                { model: Company, as: 'company', attributes: ['id', 'name'] },
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


/**
 * Retrieves a summary of all properties for the authenticated company,
 * including counts of active, non-inactive, and total listings.
 */
exports.getPropertiesSummary = async (req, res) => {
    try {
        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(403).json({ message: 'User is not associated with a company.' });
        }

        const company_id = req.user.employee.company_id;

        const propertiesSummary = await Property.findAll({
            where: { company_id: company_id },
            attributes: [
                'id',
                'name',

                [
                    db.sequelize.fn('COUNT', db.sequelize.where(db.sequelize.col('flats->listings.status'), 'active')),
                    'activeListingsCount'
                ],

                [
                    db.sequelize.fn('COUNT', db.sequelize.where(db.sequelize.col('flats->listings.status'), {
                        [Op.in]: ['pending']
                    })),
                    'pendingListingsCount'
                ],

                [
                    db.sequelize.fn('COUNT', db.sequelize.col('flats->listings.id')),
                    'totalListingsCount'
                ]
            ],
            include: [
                {
                    model: Photo,
                    as: 'photos',
                    required: false,
                    where: { imageable_type: 'Property' }
                },

                {
                    model: Flat,
                    as: 'flats',
                    attributes: [],
                    required: false,
                    include: [{
                        model: Listing,
                        as: 'listings',
                        attributes: [],
                        required: false,
                    }],
                }
            ],
            group: ['Property.id', 'photos.id'],
            order: [['name', 'ASC']]
        });

        const formattedResult = propertiesSummary.reduce((acc, property) => {
            const propertyId = property.id;

            if (!acc.find(p => p.id === propertyId)) {
                const counts = {
                    activeListingsCount: parseInt(property.dataValues.activeListingsCount, 10) || 0,
                    nonInactiveListingsCount: parseInt(property.dataValues.nonInactiveListingsCount, 10) || 0,
                    totalListingsCount: parseInt(property.dataValues.totalListingsCount, 10) || 0,
                };

                const propertyPhotos = propertiesSummary
                    .filter(p => p.id === propertyId && p.photos)
                    .map(p => p.photos)
                    .flat()
                    .filter((photo, index, self) =>
                        index === self.findIndex((t) => t.id === photo.id)
                    );

                acc.push({
                    id: property.id,
                    name: property.name,
                    photos: propertyPhotos,
                    ...counts,
                });
            }
            return acc;
        }, []);


        res.status(200).json({ properties: formattedResult });

    } catch (error) {
        logger.error('Error fetching property listing summary:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//get all listings for a spesfic company
exports.getListingsByCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { type } = req.query;

        // Normalize your incoming type query to match your database ENUM options exactly
        let formattedType = undefined;
        if (type) {
            const upperType = type.toUpperCase();
            formattedType = upperType === '3BHK_PLUS' ? '3BHK+' : upperType;
        }

        const listings = await Listing.findAll({
            where: {
                company_id: companyId,
                status: 'active'
            },
            include: [
                {
                    model: Flat,
                    as: 'flat',
                    // Use standard object validation properties on the targeted model block directly
                    where: formattedType ? { type: formattedType } : undefined,
                    required: !!formattedType, // Forces an INNER JOIN if type filter is present
                    include: [
                        {
                            model: Property,
                            as: 'property',

                        },
                        {
                            model: Photo,
                            as: 'photos'
                        }
                    ]
                },
                {
                    model: User,
                    as: 'lister',
                    attributes: { exclude: ['password'] }
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['id', 'name']
                },
            ],
        });

        res.status(200).json(listings);
    } catch (error) {
        logger.error(`Error fetching listings for company ${req.params.companyId}:`, error);
        res.status(500).json({ error: 'Internal server error.', details: error.message });
    }
};