const db = require('../models');
const logger = require('../utils/logger');
const Booking = db.Booking;
const Flat = db.Flat;
const Property = db.Property;
const Tenant = db.Tenant;
const Photo = db.Photo;
const { Op } = require('sequelize');
const { createBookingSchema, updateBookingSchema } = require('../utils/validator');

/**
 * Creates a new Booking, updates the flat's status, and updates the tenant's ledger.
 */
exports.createBooking = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { error } = createBookingSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    const { flat_id, tenant_id, start_date, end_date, monthly_rent, security_amount, security_type } = req.body;
    const company_id = req.user.employee.company_id;

    const tenant = await Tenant.findByPk(tenant_id, { transaction });
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tenant record not found.' });
    }
    if (tenant.status !== 'available') {
      await transaction.rollback();
      return res.status(409).json({ message: 'The selected tenant already has an active booking and is not available.' });
    }

    const flat = await Flat.findByPk(flat_id, { transaction });
    if (!flat) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Flat not found.' });
    }
    if (flat.company_id !== company_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not authorized to book a flat for this company.' });
    }
    if (flat.flatStatus !== 'available') {
      await transaction.rollback();
      return res.status(409).json({ message: 'This flat is not available for booking.' });
    }

    const newBooking = await Booking.create({
      flat_id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      security_amount,
      security_type,
      status: 'active',
    }, { transaction });

    await flat.update({ flatStatus: 'occupied' }, { transaction });
    await tenant.update({ status: 'occupied' }, { transaction });

    await transaction.commit();

    const completeBooking = await Booking.findByPk(newBooking.id, {
      include: [
        { model: Flat, as: 'flat', include: [{ model: Property, as: 'property' }] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] },
      ],
    });

    logger.info(`New booking created for flat ${flat_id} with tenant ${tenant_id}.`);
    res.status(201).json({ message: 'Booking created successfully.', booking: completeBooking });

  } catch (error) {
    if (transaction.finished !== 'commit') await transaction.rollback();
    logger.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a single booking record by its ID.
 */
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const company_id = req.user.employee.company_id;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Flat, as: 'flat', include: [{ model: Property, as: 'property' }] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.flat.company_id !== company_id) {
      return res.status(403).json({ message: 'You are not authorized to view this booking.' });
    }

    res.status(200).json(booking);
  } catch (error) {
    logger.error(`Error fetching booking ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a list of all bookings for the user's company.
 */
exports.getAllBookings = async (req, res) => {
  try {
    const company_id = req.user.employee.company_id;
    const {
      limit = 10,
      offset = 0,
      keywords,
      status,
      flatType,
      sortBy = 'start_date',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = {};
    const flatWhereClause = { company_id: company_id };

    if (keywords) {
      const keywordQuery = { [Op.like]: `%${keywords}%` };
      whereClause[Op.or] = [
        { '$tenant.name$': keywordQuery },
        { '$tenant.phone_number$': keywordQuery },
        { '$flat.title$': keywordQuery },
        { '$flat.unit_number$': keywordQuery },
        { '$flat.property.name$': keywordQuery },
      ];
    }

    if (status && ['active', 'ended', 'cancelled'].includes(status)) {
      whereClause.status = status;
    }

    if (flatType && ['1RK', '1BHK', '2BHK', '3BHK', '3BHK+'].includes(flatType)) {
      flatWhereClause.type = flatType;
    }

    const validSortColumns = ['start_date', 'end_date', 'monthly_rent', 'created_at'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'start_date';
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const order = finalSortBy === 'monthly_rent'
      ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
      : [[finalSortBy, finalSortOrder]];

    const finalLimit = parseInt(limit, 10);
    const finalOffset = parseInt(offset, 10);

    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Flat,
          as: 'flat',
          where: flatWhereClause,
          required: true,
          include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }]
        },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] },
      ],
      order: order,
      limit: finalLimit,
      offset: finalOffset,
      distinct: true,
      subQuery: false,
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / finalLimit),
      currentPage: Math.floor(finalOffset / finalLimit) + 1,
      bookings: rows,
    });
  } catch (error) {
    logger.error('Error fetching all bookings:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a list of all bookings for a specific property.
 */
exports.getBookingsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const company_id = req.user.employee.company_id;

    const {
      limit = 10,
      offset = 0,
      keywords,
      status,
      flatType,
      sortBy = 'start_date',
      sortOrder = 'DESC'

    } = req.query;

    const property = await Property.findOne({ where: { id: propertyId, company_id: company_id } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found or you are not authorized to view it.' });
    }

    const whereClause = {};
    const flatWhereClause = { property_id: propertyId };

    if (keywords) {
      const keywordQuery = { [Op.like]: `%${keywords}%` };
      whereClause[Op.or] = [
        { '$tenant.name$': keywordQuery },
        { '$tenant.phone_number$': keywordQuery },
        { '$flat.title$': keywordQuery },
        { '$flat.unit_number$': keywordQuery },
      ];
    }

    if (status && ['active', 'ended', 'cancelled'].includes(status)) {
      whereClause.status = status;
    }

    if (flatType && ['1RK', '1BHK', '2BHK', '3BHK', '3BHK+'].includes(flatType)) {
      flatWhereClause.type = flatType;
    }

    const validSortColumns = ['start_date', 'end_date', 'monthly_rent', 'created_at'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'start_date';
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const order = finalSortBy === 'monthly_rent'
      ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
      : [[finalSortBy, finalSortOrder]];

    const finalLimit = parseInt(limit, 10);
    const finalOffset = parseInt(offset, 10);

    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Flat,
          as: 'flat',
          where: flatWhereClause,
          required: true,
          include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }]
        },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] },
      ],
      order: order,
      limit: finalLimit,
      offset: finalOffset,
      distinct: true,
      subQuery: false,
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / finalLimit),
      currentPage: Math.floor(finalOffset / finalLimit) + 1,
      bookings: rows,
    });
  } catch (error) {
    logger.error(`Error fetching bookings for property ${req.params.propertyId}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


/**
 * Updates an existing booking record.
 */
exports.updateBooking = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const company_id = req.user.employee.company_id;

    const { error, value } = updateBookingSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    const booking = await Booking.findByPk(id, {
      include: [{ model: Flat, as: 'flat' }],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.flat.company_id !== company_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not authorized to update this booking.' });
    }

    const newStatus = value.status;
    const oldStatus = booking.status;

    if (newStatus && (newStatus === 'ended' || newStatus === 'cancelled') && oldStatus === 'active') {
      const flat = await Flat.findByPk(booking.flat_id, { transaction });
      if (flat) {
        await flat.update({ flatStatus: 'available' }, { transaction });
      }
      const tenant = await Tenant.findByPk(booking.tenant_id, { transaction });
      if (tenant) {
        await tenant.update({ status: 'available' }, { transaction });
      }
    }

    await booking.update(value, { transaction });

    await transaction.commit();

    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Flat, as: 'flat', include: [{ model: Property, as: 'property' }] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] },
      ],
    });

    res.status(200).json({ message: 'Booking updated successfully.', booking: updatedBooking });

  } catch (error) {
    if (transaction.finished !== 'commit') await transaction.rollback();
    logger.error(`Error updating booking ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Deletes a booking record, updates the flat status, and adjusts the tenant's ledger.
 */
exports.deleteBooking = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const company_id = req.user.employee.company_id;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Flat, as: 'flat' }],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.flat.company_id !== company_id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You are not authorized to delete this booking.' });
    }

    const flat = await Flat.findByPk(booking.flat_id, { transaction });
    if (flat) {
      await flat.update({ flatStatus: 'available' }, { transaction });
    }

    const tenant = await Tenant.findByPk(booking.tenant_id, { transaction });
    if (tenant) {
      await tenant.update({ status: 'available' }, { transaction });
    }

    await booking.destroy({ transaction });

    await transaction.commit();
    res.status(200).json({ message: 'Booking deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') await transaction.rollback();
    logger.error(`Error deleting booking ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Fetches a list of properties with aggregated booking statistics (active, ending soon).
 */
exports.getPropertiesSummary = async (req, res) => {
  try {
    const company_id = req.user.employee.company_id;

    const endingSoonCondition = db.sequelize.literal(`
        CASE 
            WHEN \`flats->booking\`.\`status\` = 'active' 
            AND \`flats->booking\`.\`end_date\` <= DATE_ADD(CURDATE(), INTERVAL 2 MONTH)
            AND \`flats->booking\`.\`end_date\` > CURDATE()
            THEN 1 ELSE NULL 
        END
    `);

    const propertiesSummary = await Property.findAll({
      where: { company_id: company_id },
      attributes: [
        'id',
        'name',
        [
          db.sequelize.fn('COUNT', db.sequelize.where(db.sequelize.col('flats->booking.status'), 'active')),
          'activeBookingsCount'
        ],

        [
          db.sequelize.fn('COUNT', endingSoonCondition),
          'endingSoonCount'
        ],

        [
          db.sequelize.fn('COUNT', db.sequelize.col('flats->booking.id')),
          'totalBookingsCount'
        ]
      ],
      include: [
        {
          model: Photo,
          as: 'photos',

          required: false,
        },

        {
          model: Flat,
          as: 'flats',
          attributes: [],
          include: [{
            model: Booking,
            as: 'booking',
            attributes: [],
            required: false,
          }],
          required: false,
        }
      ],
      group: ['Property.id', 'photos.id'],
      order: [['name', 'ASC']]
    });

    const formattedResult = propertiesSummary.map(property => ({
      id: property.id,
      name: property.name,
      address: property.address,
      description: property.description,
      isManaged: property.is_managed,
      photos: property.photos,
      activeBookingsCount: parseInt(property.dataValues.activeBookingsCount, 10) || 0,
      endingSoonCount: parseInt(property.dataValues.endingSoonCount, 10) || 0,
      totalBookingsCount: parseInt(property.dataValues.totalBookingsCount, 10) || 0,
    }));

    res.status(200).json({ properties: formattedResult });

  } catch (error) {
    logger.error('Error fetching property booking summary:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};