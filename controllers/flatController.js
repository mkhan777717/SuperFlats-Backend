const db = require('../models');
const { Op, UniqueConstraintError } = require('sequelize');
const logger = require('../utils/logger');
// Assuming you will create a separate validator schema for flats
const { createFlatSchema, updateFlatSchema } = require('../utils/validator');
const { uploadFile, deleteFile } = require('../utils/fileService');

const Flat = db.Flat;
const Property = db.Property;
const Photo = db.Photo; // Reused for flat photos, but linked via flat_id

// Helper function to map flat type to property count column title
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

        // Normalize unit_number to match validator (trim + uppercase)
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

        // 1. Verify Property Existence and Ownership
        const property = await Property.findByPk(propertyId, { transaction });
        if (!property || property.company_id !== company_id) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Property not found or access denied.' });
        }

        // Validate flat type early (avoid creating a flat with invalid type)
        const countColumn = getCountColumn(type);
        if (!countColumn) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid flat type provided.' });
        }

        // BUG FIX: Check if there are available units of this type BEFORE creating the flat.
        if (property[countColumn] <= 0) {
            await transaction.rollback();
            logger.warn(`Failed to create flat: No available units of type '${type}' for property ID ${propertyId}.`);
            return res.status(409).json({ message: `No available units of type '${type}' left for this property.` });
        }

        propertyIdInt = parseInt(propertyId, 10);
        // 2. Create the Flat (handle unique constraint)
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

        // 3. Update Property Unit Count (DECREMENT available count)
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
    const { propertyId } = req.params; // Get propertyId from URL parameters

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
        searchTerm,
        flatType,
        flatStatus,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        limit = 10,
        offset = 0,
    } = queryParams;

    // Base conditions are company ownership and the specific property ID
    const whereConditions = {
        company_id: company_id,
        property_id: propertyId, // Enforced by route param
    };

    const andConditions = [];

    const validSortColumns = ['created_at', 'unit_number', /* 'monthly_rent' removed */, 'area_sqft'];
    const validStatuses = ['available', 'occupied', 'maintenance'];


    // 1. Filtering by Search Term (Unit Number, title, Description)
    if (searchTerm) {
        andConditions.push({
            [Op.or]: [
                { unit_number: { [Op.like]: `%${searchTerm}%` } },
                { title: { [Op.like]: `%${searchTerm}%` } },
                { description: { [Op.like]: `%${searchTerm}%` } },
            ],
        });
    }

    // 2. Filtering by Flat Type (e.g., '2BHK')
    if (flatType && getCountColumn(flatType)) {
        andConditions.push({ type: flatType });
    }

    // 3. Filtering by flatStatus (e.g., 'occupied')
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

        // Authentication and Authorization Check
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

        // 1. Find and attempt to delete photos from storage (tolerate storage failures)
        const photosToDelete = await Photo.findAll({ where: { flat_id: flatId }, transaction });
        await Promise.allSettled(photosToDelete.map(async (photo) => {
            try {
                await deleteFile(photo.photo_url, 'photo');
            } catch (err) {
                logger.warn(`Failed to delete photo from storage for photo id ${photo.id}: ${err.message || err}`);
            }
        }));

        // 2. Delete the Flat and its Photos (CASCADE on foreign key should handle this, but explicit is safer)
        await Photo.destroy({ where: { flat_id: flatId }, transaction }); // Explicitly delete photos first
        await flat.destroy({ transaction });

        // 3. Update Property Unit Count (INCREMENT available count)
        const property = await Property.findByPk(propertyId, { transaction });
        if (property) {
            await property.increment(countColumn, { by: 1, transaction });
        } else {
            // Should not happen, but good check
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

// -----------------------------------------------------------
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
                { model: Photo, as: 'photos', where: { flat_id: flatId }, required: false },
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

// -----------------------------------------------------------
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

        // Validate update payload
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

        // Authentication and Authorization Check
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
                // Fetch the property to update counts
                const property = await Property.findByPk(flat.property_id, { transaction });

                if (property) {
                    // Increment old type's available count and Decrement new type's available count
                    await property.increment(oldColumn, { by: 1, transaction });
                    await property.decrement(newColumn, { by: 1, transaction });
                    logger.info(`Flat ID ${flatId} type changed: Incremented ${oldColumn} and Decremented ${newColumn} on Property ID ${flat.property_id}`);
                }
            } else {
                // If the new type is invalid, block the update
                logger.warn(`Invalid new flat type '${newType}' provided for update on flat ID ${flatId}. Blocking type change.`);
                delete updateData.type;
            }
        }

        // Normalize and compare unit_number to avoid errors if it's unchanged
        const currentUnitNormalized = flat.unit_number ? String(flat.unit_number).trim().toUpperCase() : null;
        if (updateData.unit_number) {
            updateData.unit_number = String(updateData.unit_number).trim().toUpperCase();
        }

        // Only check for uniqueness if the normalized value has actually changed
        if (updateData.unit_number && updateData.unit_number !== currentUnitNormalized) {
            // Proactively check for conflicts to provide a clear error message.
            const conflictingFlat = await Flat.findOne({
                where: {
                    property_id: flat.property_id,
                    unit_number: updateData.unit_number,
                    id: { [Op.ne]: flatId } // Exclude the current flat from the check.
                },
                transaction
            });

            if (conflictingFlat) {
                await transaction.rollback();
                return res.status(409).json({ message: 'The unit number provided already exists for another flat in this property.' });
            }
        } else {
            // If the unit_number is present but identical (after normalization),
            // remove it from the update payload to prevent an unnecessary DB write.
            if (updateData.unit_number && updateData.unit_number === currentUnitNormalized) {
                delete updateData.unit_number;
            }
        }

        // If status is set to 'available', no lease_end_date exists in new model — nothing to clear
        try {
            await flat.update(updateData, { transaction });
        } catch (err) {
            if (err instanceof UniqueConstraintError) {
                await transaction.rollback();
                logger.warn(`Duplicate unit_number detected for flat ID ${flatId}`);
                // Use a clear, specific message for the update conflict
                return res.status(409).json({ message: 'The unit number provided already exists for a flat in this property.' });
            }
            throw err; // Re-throw other errors
        }

        await transaction.commit();

        const updatedFlatWithAssociations = await Flat.findByPk(flatId, {
            include: [
                { model: Property, as: 'property' },
                { model: Photo, as: 'photos', where: { flat_id: flatId }, required: false },
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

        // 1. Find the photo to be deleted
        const photo = await Photo.findByPk(photoId, { transaction });

        if (!photo) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Photo not found.' });
        }

        // 2. Security & Authorization: Ensure the photo belongs to the flat and the user owns the flat.
        if (photo.flat_id !== parseInt(flatId, 10)) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Photo does not belong to the specified flat.' });
        }

        const flat = await Flat.findByPk(flatId, { attributes: ['company_id'], transaction });
        if (!req.user || !req.user.employee || !flat || flat.company_id !== req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'You are not authorized to perform this action.' });
        }

        const wasPrimary = photo.is_primary;

        // 3. Delete the photo file from storage (e.g., S3). Tolerate failure here.
        try {
            await deleteFile(photo.photo_url, 'photo');
        } catch (err) {
            logger.warn(`Failed to delete photo from storage for photo ID ${photoId}: ${err.message}`);
        }

        // 4. Delete the photo record from the database
        await photo.destroy({ transaction });

        // 5. If the deleted photo was the primary, assign a new primary
        if (wasPrimary) {
            const nextPhoto = await Photo.findOne({
                where: { flat_id: flatId },
                order: [['id', 'ASC']], // Pick the oldest remaining photo as the new primary
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


// -----------------------------------------------------------
/**
 * Handles the upload of a single photo and links it to a specific flat.
 */
exports.uploadFlatPhoto = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { flatId } = req.params;

        if (!flatId || !req.file) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Flat ID and file upload are required.' });
        }

        const parsedFlatId = parseInt(flatId, 10);
        if (isNaN(parsedFlatId)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid Flat ID format.' });
        }

        const flat = await Flat.findByPk(parsedFlatId, { transaction });
        if (!flat) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Flat not found.' });
        }

        // Authentication and Authorization Check
        if (!req.user || !req.user.employee || flat.company_id !== req.user.employee.company_id) {
            await transaction.rollback();
            return res.status(403).json({ message: 'You are not authorized to add photos to this flat.' });
        }

        const photoCount = await Photo.count({
            where: { flat_id: parsedFlatId }, // Check count linked to flat_id
            transaction,
        });

        if (photoCount >= 10) { // Max 10 photos per flat
            await transaction.rollback();
            return res.status(400).json({ message: 'Maximum of 10 photos allowed per flat.' });
        }

        const photoUrl = await uploadFile(req.file);

        // Create DB record; if it fails, try to remove uploaded file to avoid orphan
        let newPhoto;
        try {
            newPhoto = await Photo.create({
                property_id: flat.property_id,
                flat_id: parsedFlatId, // Use the parsed integer ID
                photo_url: photoUrl,
                is_primary: photoCount === 0, // Set the first photo as primary automatically
            }, { transaction });
        } catch (err) {
            try { await deleteFile(photoUrl, 'photo'); } catch (dErr) { logger.warn('Failed to cleanup uploaded file after DB error', dErr); }
            await transaction.rollback();
            logger.error('Error creating photo record:', err);
            return res.status(500).json({ error: 'Failed to save photo record.' });
        }

        await transaction.commit();
        logger.info(`Photo uploaded and linked to flat ID ${parsedFlatId}.`);
        res.status(201).json({ message: 'Photo uploaded successfully.', photo: newPhoto });

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error('Error uploading flat image:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};