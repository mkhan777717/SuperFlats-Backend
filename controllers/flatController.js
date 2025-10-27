const db = require('../models');
const { Op, UniqueConstraintError } = require('sequelize');
const logger = require('../utils/logger');
const { createFlatSchema, updateFlatSchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');

const Flat = db.Flat;
const Property = db.Property;
const Photo = db.Photo;

const getCountColumn = (type) => {
    switch (type) {
        case '1RK':
            return 'count_1rk';
        case '1BHK':
            return 'count_1bhk';
        case '2BHK':
            return 'count_2bhk';
        case '3BHK':
            return 'count_3bhk';
        case '3BHK+':
            return 'count_3bhk_plus';
        default:
            return null;
    }
};

exports.createFlat = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { propertyId } = req.params;
        const { error } = createFlatSchema.validate(req.body);


        if (error) {
            await transaction.rollback();
            logger.warn(`Flat validation failed: ${error.details[0].message}`);
            return res.status(400).json({ message: error.details[0].message });
        }

        const {
            title, unit_number, type, area_sqft, flatStatus, description, unique_amenities
        } = req.body;

        const normalizedUnitNumber = unit_number ? String(unit_number).trim().toUpperCase() : null;
        if (!normalizedUnitNumber) {
            await transaction.rollback();
            return res.status(400).json({ message: 'unit_number is required.' });
        }

        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
        }

        const company_id = req.user.employee.company_id;

        const property = await Property.findByPk(propertyId, { transaction });
        if (!property || property.company_id !== company_id) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Property not found or access denied.' });
        }
        const countColumn = getCountColumn(type);
        if (!countColumn) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid flat type provided.' });
        }
        if (property[countColumn] <= 0) {
            await transaction.rollback();
            logger.warn(`Failed to create flat: No available units of type '${type}' for property ID ${propertyId}.`);
            return res.status(409).json({ message: `No available units of type '${type}' left for this property.` });
        }

        propertyIdInt = parseInt(propertyId, 10);
        let newFlat;
        try {
            newFlat = await Flat.create({
                company_id,
                property_id: propertyIdInt,
                title: title,
                description: description,
                unit_number: normalizedUnitNumber,
                type: type,
                area_sqft: area_sqft,
                flatStatus: flatStatus,
                unique_amenities: unique_amenities || [],
            }, { transaction });
        } catch (err) {
            if (err instanceof UniqueConstraintError) {
                await transaction.rollback();
                logger.warn(`Duplicate flat for property ${propertyId} unit_number ${unit_number}`);
                return res.status(409).json({ message: 'A flat with that Unit Number already exists for this property.' });
            }
            throw err;
        }

        await property.decrement(countColumn, { by: 1, transaction });

        await transaction.commit();

        logger.info(`New flat created with ID: ${newFlat.id} for property ID: ${propertyId}`);
        res.status(201).json({ message: 'Flat created successfully, and property count updated.', flat: newFlat });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error('Error creating flat:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Retrieves a list of flats for a specific property, enforcing company ownership.
 */
exports.getFlatsByProperty = async (req, res) => {
    const { propertyId } = req.params;

    if (!req.user || !req.user.employee || !req.user.employee.company_id) {
        return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
    }

    const queryParams = req.query;
    const company_id = req.user.employee.company_id;

    try {
        const property = await Property.findByPk(propertyId);
        if (!property || property.company_id !== company_id) {
            logger.warn(`Property ID ${propertyId} not found or access denied for company ${company_id}.`);
            return res.status(404).json({ message: 'Property not found or access denied.' });
        }
    } catch (error) {
        logger.error(`Error verifying property ID ${propertyId}:`, error);
        return res.status(500).json({ error: 'Internal server error during property verification.' });
    }

    const {
        keywords,
        flatType,
        flatStatus,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        limit = 10,
        offset = 0,
    } = queryParams;

    const whereConditions = {
        company_id: company_id,
        property_id: propertyId,
    };

    const andConditions = [];

    const validSortColumns = ['created_at', 'unit_number', 'area_sqft'];
    const validStatuses = ['available', 'occupied', 'maintenance'];


    if (keywords) {
        andConditions.push({
            [Op.or]: [
                { unit_number: { [Op.like]: `%${keywords}%` } },
                { title: { [Op.like]: `%${keywords}%` } },
                { description: { [Op.like]: `%${keywords}%` } },
            ],
        });
    }

    if (flatType && getCountColumn(flatType)) {
        andConditions.push({ type: flatType });
    }
    if (flatStatus && validStatuses.includes(flatStatus)) {
        andConditions.push({ flatStatus: flatStatus });
    }

    if (andConditions.length > 0) {
        whereConditions[Op.and] = andConditions;
    }
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const finalLimit = Math.max(1, parseInt(limit, 10) || 10);
    const finalOffset = Math.max(0, parseInt(offset, 10) || 0);

    try {
        const results = await Flat.findAndCountAll({
            distinct: true,
            where: whereConditions,
            include: [
                { model: Property, as: 'property' },
                { model: Photo, as: 'photos', where: { is_primary: true }, required: false, separate: true },
            ],
            limit: finalLimit,
            offset: finalOffset,
            order: [[finalSortBy, finalSortOrder]],
        });

        const totalPages = Math.ceil(results.count / finalLimit);
        const currentPage = Math.floor(finalOffset / finalLimit) + 1;

        return res.json({
            totalItems: results.count,
            totalPages: totalPages,
            currentPage: currentPage,
            limit: finalLimit,
            flats: results.rows,
        });

    } catch (error) {
        logger.error(`Error retrieving flats for property ID ${propertyId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Deletes a flat, its associated photos, and updates the unit count on the parent property.
 */
exports.deleteFlat = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { flatId } = req.params;

        const flat = await Flat.findByPk(flatId, { transaction });
        if (!flat) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Flat not found.' });
        }

        if (!req.user || !req.user.employee || flat.company_id !== req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'You are not authorized to delete this flat.' });
        }

        const propertyId = flat.property_id;
        const flatType = flat.type;
        const countColumn = getCountColumn(flatType);

        if (!countColumn) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid flat type prevents property count update.' });
        }

        const photosToDelete = await Photo.findAll({ where: { imageable_id: flatId, imageable_type: 'Flat' }, transaction });
        await Promise.allSettled(photosToDelete.map(async (photo) => {
            try {
                await deleteFile(photo.photo_url, 'photo');
            } catch (err) {
                logger.warn(`Failed to delete photo from storage for photo id ${photo.id}: ${err.message || err}`);
            }
        }));
        await Photo.destroy({ where: { imageable_id: flatId, imageable_type: 'Flat' }, transaction });
        await flat.destroy({ transaction });

        const property = await Property.findByPk(propertyId, { transaction });
        if (property) {
            await property.increment(countColumn, { by: 1, transaction });
        } else {
            logger.warn(`Property ID ${propertyId} not found during flat deletion cleanup.`);
        }

        await transaction.commit();
        logger.info(`Flat with ID ${flatId} deleted successfully. Property count decremented.`);
        res.status(200).json({ message: 'Flat deleted successfully.' });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error deleting flat with ID ${req.params.flatId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a single flat by its ID, including all related details.
 */
exports.getFlatById = async (req, res) => {
    try {
        const { flatId } = req.params;

        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
        }

        const flat = await Flat.findByPk(flatId, {
            include: [
                { model: Property, as: 'property', },
                { model: Photo, as: 'photos', required: false },
            ],
        });

        if (!flat || flat.company_id !== req.user.employee.company_id) {
            logger.warn(`Flat with ID ${flatId} not found or access denied.`);
            return res.status(404).json({ message: 'Flat not found.' });
        }

        res.status(200).json({ flat });

    } catch (error) {
        logger.error(`Error fetching flat with ID ${req.params.flatId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Updates an existing flat's data. 
 * NOTE: Changing the flat's 'type' would require complex logic to update 
 * the old and new property counts, which is omitted for simplicity here.
 */
exports.updateFlat = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { flatId } = req.params;
        const updateData = req.body;
        const { error: validationError } = updateFlatSchema.validate(updateData);
        if (validationError) {
            await transaction.rollback();
            logger.warn(`Flat update validation failed: ${validationError.details[0].message}`);
            return res.status(400).json({ message: validationError.details[0].message });
        }

        const flat = await Flat.findByPk(flatId, { transaction });
        if (!flat) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Flat not found.' });
        }
        if (!req.user || !req.user.employee || flat.company_id !== req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'You are not authorized to update this flat.' });
        }

        if (updateData.type && updateData.type !== flat.type) {
            const oldType = flat.type;
            const newType = updateData.type;

            const oldColumn = getCountColumn(oldType);
            const newColumn = getCountColumn(newType);

            if (oldColumn && newColumn) {
                const property = await Property.findByPk(flat.property_id, { transaction });

                if (property) {
                    await property.increment(oldColumn, { by: 1, transaction });
                    await property.decrement(newColumn, { by: 1, transaction });
                    logger.info(`Flat ID ${flatId} type changed: Incremented ${oldColumn} and Decremented ${newColumn} on Property ID ${flat.property_id}`);
                }
            } else {
                logger.warn(`Invalid new flat type '${newType}' provided for update on flat ID ${flatId}. Blocking type change.`);
                delete updateData.type;
            }
        }

        const currentUnitNormalized = flat.unit_number ? String(flat.unit_number).trim().toUpperCase() : null;
        if (updateData.unit_number) {
            updateData.unit_number = String(updateData.unit_number).trim().toUpperCase();
        }

        if (updateData.unit_number && updateData.unit_number !== currentUnitNormalized) {
            const conflictingFlat = await Flat.findOne({
                where: {
                    property_id: flat.property_id,
                    unit_number: updateData.unit_number,
                    id: { [Op.ne]: flatId }
                },
                transaction
            });

            if (conflictingFlat) {
                await transaction.rollback();
                return res.status(409).json({ message: 'The unit number provided already exists for another flat in this property.' });
            }
        } else {
            if (updateData.unit_number && updateData.unit_number === currentUnitNormalized) {
                delete updateData.unit_number;
            }
        }

        try {
            await flat.update(updateData, { transaction });
        } catch (err) {
            if (err instanceof UniqueConstraintError) {
                await transaction.rollback();
                logger.warn(`Duplicate unit_number detected for flat ID ${flatId}`);
                return res.status(409).json({ message: 'The unit number provided already exists for a flat in this property.' });
            }
            throw err;
        }

        await transaction.commit();

        const updatedFlatWithAssociations = await Flat.findByPk(flatId, {
            include: [
                { model: Property, as: 'property' },
                { model: Photo, as: 'photos', required: false },
            ]
        });

        logger.info(`Flat with ID ${flatId} updated successfully.`);
        res.status(200).json({ message: 'Flat updated successfully.', flat: updatedFlatWithAssociations });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error updating flat with ID ${req.params.flatId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Deletes a single photo from a flat by its ID and reassigns primary status if needed.
 */
exports.deleteFlatPhoto = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { flatId, photoId } = req.params;

        const photo = await Photo.findByPk(photoId, { transaction });

        if (!photo) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Photo not found.' });
        }
        if (photo.imageable_type !== 'Flat' || photo.imageable_id !== parseInt(flatId, 10)) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Photo does not belong to the specified flat.' });
        }

        const flat = await Flat.findByPk(flatId, { attributes: ['company_id'], transaction });
        if (!req.user || !req.user.employee || !flat || flat.company_id !== req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'You are not authorized to perform this action.' });
        }

        const wasPrimary = photo.is_primary;
        try {
            await deleteFile(photo.photo_url, 'photo');
        } catch (err) {
            logger.warn(`Failed to delete photo from storage for photo ID ${photoId}: ${err.message}`);
        }
        await photo.destroy({ transaction });
        if (wasPrimary) {
            const nextPhoto = await Photo.findOne({
                where: {
                    imageable_id: flatId,
                    imageable_type: 'Flat'
                },
                order: [['id', 'ASC']],
                transaction,
            });

            if (nextPhoto) {
                await nextPhoto.update({ is_primary: true }, { transaction });
                logger.info(`Reassigned primary photo to ID ${nextPhoto.id} for flat ID ${flatId}.`);
            }
        }

        await transaction.commit();
        logger.info(`Photo with ID ${photoId} deleted successfully from flat ID ${flatId}.`);
        res.status(200).json({ message: 'Photo deleted successfully.' });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error(`Error deleting photo with ID ${req.params.photoId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Handles the upload of a single photo and links it to a specific flat.
 */
exports.uploadFlatPhoto = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { flatId } = req.params;
        const { name } = req.body;

        if (!flatId || !req.file) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Flat ID and file upload are required.' });
        }

        const flat = await Flat.findByPk(flatId, { transaction });
        if (!flat) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Flat not found.' });
        }

        if (!req.user || !req.user.employee || flat.company_id !== req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'You are not authorized to add photos to this flat.' });
        }

        const photoCount = await Photo.count({
            where: {
                imageable_id: flatId,
                imageable_type: 'Flat'
            },
            transaction,
        });

        if (photoCount >= 10) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Maximum of 10 photos allowed per flat.' });
        }

        const photoUrl = await uploadFile(req.file);

        let newPhoto;
        try {
            newPhoto = await Photo.create({
                photo_url: photoUrl,
                name: name || null,
                imageable_id: flatId,
                imageable_type: 'Flat',
                is_primary: photoCount === 0,
            }, { transaction });
        } catch (err) {
            try { await deleteFile(photoUrl, 'photo'); } catch (dErr) { logger.warn('Failed to cleanup uploaded file after DB error', dErr); }
            await transaction.rollback();
            logger.error('Error creating photo record:', err);
            return res.status(500).json({ error: 'Failed to save photo record.' });
        }

        await transaction.commit();
        logger.info(`Photo uploaded and linked to flat ID ${flatId}.`);
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error('Error uploading flat image:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a paginated and filtered list of all flats for the entire company.
 */
exports.getFlats = async (req, res) => {
    try {
        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(401).json({ message: 'Authentication required or user not associated with a company.' });
        }

        const company_id = req.user.employee.company_id;
        const {
            keywords,
            propertyId, // Allow filtering by property
            flatType,
            flatStatus,
            sortBy = 'created_at',
            sortOrder = 'DESC',
            limit = 10,
            offset = 0,
        } = req.query;

        const whereConditions = { company_id: company_id };

        if (keywords) {
            whereConditions[Op.or] = [
                { unit_number: { [Op.like]: `%${keywords}%` } },
                { title: { [Op.like]: `%${keywords}%` } },
                { '$property.name$': { [Op.like]: `%${keywords}%` } }, // Search by property name
            ];
        }

        if (propertyId) {
            whereConditions.property_id = propertyId;
        }
        if (flatType) {
            whereConditions.type = flatType;
        }
        if (flatStatus) {
            whereConditions.flatStatus = flatStatus;
        }

        const validSortColumns = ['created_at', 'unit_number', 'area_sqft'];
        const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const finalLimit = parseInt(limit, 10);
        const finalOffset = parseInt(offset, 10);

        const { count, rows } = await Flat.findAndCountAll({
            where: whereConditions,
            include: [
                { model: Property, as: 'property', attributes: ['id', 'name'] },
                { model: Photo, as: 'photos', where: { is_primary: true }, required: false },
            ],
            limit: finalLimit,
            offset: finalOffset,
            order: [[finalSortBy, finalSortOrder]],
            distinct: true,
            subQuery: false,
        });

        res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / finalLimit),
            currentPage: Math.floor(finalOffset / finalLimit) + 1,
            flats: rows,
        });

    } catch (error) {
        logger.error(`Error fetching all flats for company ${req.user.employee.company_id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get available flats for listing for a specific property
exports.getAvailableFlats = async (req, res) => {
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

exports.getPropertiesSummary = async (req, res) => {
    try {
        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(403).json({ message: 'User is not associated with a company.' });
        }
        const company_id = req.user.employee.company_id;
        const flatSummary = await db.Property.findAll({
            where: { company_id: company_id },
            attributes: [
                'id',
                'name',
                
                [
                    db.sequelize.fn('COUNT', db.sequelize.col('flats.id')),
                    'totalFlatCount'
                ],
                [
                    db.sequelize.literal(`SUM(CASE WHEN \`flats\`.\`flatStatus\` = 'available' THEN 1 ELSE 0 END)`),
                    'availableFlatCount'
                ],
                
                [
                    db.sequelize.literal(`SUM(CASE WHEN \`flats\`.\`flatStatus\` = 'occupied' THEN 1 ELSE 0 END)`),
                    'occupiedFlatCount'
                ],
            ],
            include: [
                {
                    model: db.Flat, 
                    as: 'flats',
                    attributes: [], 
                    required: false, 
                },
                {
                    model: db.Photo, 
                    as: 'photos',
                    required: false,
                    where: { imageable_type: 'Property', is_primary: true } 
                },
            ],
            group: ['Property.id', 'photos.id'], 
            order: [['name', 'ASC']]
        });
        
        
        
        const finalSummary = flatSummary.reduce((acc, property) => {
            const currentPhotoObject = Array.isArray(property.photos) && property.photos.length > 0
                ? property.photos[0]
                : property.photos;
            acc.push({
                id: property.id,
                name: property.name,
                photos: currentPhotoObject ? [currentPhotoObject] : [],
                totalFlatCount: parseInt(property.dataValues.totalFlatCount, 10) || 0,
                availableFlatCount: parseInt(property.dataValues.availableFlatCount, 10) || 0,
                occupiedFlatCount: parseInt(property.dataValues.occupiedFlatCount, 10) || 0,
            });
            
            return acc;
        }, []);


        res.status(200).json({ properties: finalSummary });

    } catch (error) {
        console.error('Error fetching flat summary:', error); 
        res.status(500).json({ error: 'Internal server error.' });
    }
};