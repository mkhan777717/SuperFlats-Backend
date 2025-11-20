const { FavoritesListing, Listing, Flat, Property, Photo, Company, db, sequelize } = require('../models'); // Adjust path and models as needed
const { Op } = require('sequelize');
/**
 * @desc Toggles the favorite status of a listing for the authenticated user.
 * @route POST /api/v1/favorites/toggle/:listingId
 * @access Private
 */
const toggleFavorite = async (req, res, next) => {
    try {
        
        const userId = req.user.id; 
        const { listingId } = req.params;

        // 1. Validate listing existence (Optional but recommended)
        const listing = await Listing.findByPk(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        // 2. Check if the listing is already a favorite for this user
        const existingFavorite = await FavoritesListing.findOne({
            where: {
                user_id: userId,
                listing_id: listingId,
            },
        });

        let action;

        if (existingFavorite) {
            // 3. If found, remove (un-favorite)
            await existingFavorite.destroy();
            action = 'removed';
        } else {
            // 4. If not found, add (favorite)
            await FavoritesListing.create({
                user_id: userId,
                listing_id: listingId,
            });
            action = 'added';
        }

        return res.status(200).json({
            message: `Listing successfully ${action} to favorites.`,
            is_favorite: action === 'added',
            listingId: listingId,
        });

    } catch (error) {
        console.error('Error toggling favorite status:', error);
        // Pass the error to the Express error handler
        next(error); 
    }
};

/**
 * @desc Gets all favorite listings for the authenticated user with pagination and full details.
 * @route GET /api/v1/favorites
 * @access Private
 */
const getFavorites = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit: limitQuery = 12, offset: offsetQuery = 0, sortOrder = 'DESC' } = req.query;

        // Ensure limit and offset are integers
        const limit = parseInt(limitQuery, 10);
        const offset = parseInt(offsetQuery, 10);
        
        // 1. Get the list of favorited listing IDs for the user (with pagination)
        const { count, rows: favoriteLinks } = await FavoritesListing.findAndCountAll({
            where: { user_id: userId },
            attributes: ['listing_id'], // Only select the listing ID
            order: [['created_at', sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
            limit: limit,
            offset: offset,
        });

        const listingIds = favoriteLinks.map(link => link.listing_id);
        
        // Handle case where no listings are favorited to avoid empty array issues
        if (listingIds.length === 0) {
             return res.status(200).json({
                totalItems: 0, 
                totalPages: 0,
                currentPage: 1,
                listings: [], 
            });
        }

        // 2. Fetch the full, detailed Listing objects using the retrieved IDs
        const detailedListings = await Listing.findAll({
            where: {
                id: { [Op.in]: listingIds },
                status: 'active' 
            },
            include: [
                {
                    model: Flat,
                    as: 'flat',
                    required: true,
                    attributes: ['id', 'type', 'area_sqft', 'unit_number'],
                    include: [
                        {
                            model: Property,
                            as: 'property',
                            required: true,
                            attributes: ['id', 'name', 'city', 'address'],
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
            ],
            // 3. IMPORTANT: Fix is here! Use the imported 'sequelize' object
            order: [
                sequelize.literal(`FIELD(Listing.id, ${listingIds.join(',')})`),
            ],
        });

        // 4. Return the response in the requested paginated format
        res.status(200).json({
            totalItems: count, 
            totalPages: Math.ceil(count / limit),
            currentPage: Math.floor(offset / limit) + 1,
            listings: detailedListings, 
        });

    } catch (error) {
        console.error('Error fetching favorite listings:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


module.exports = {
    toggleFavorite,
    getFavorites,
};