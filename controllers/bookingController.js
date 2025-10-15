const db = require('../models');
const logger = require('../utils/logger');
const Booking = db.Booking;
const Flat = db.Flat;
const Property = db.Property;
const Tenant = db.Tenant;
const Ledger = db.Ledger;
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

    // 1. Verify tenant exists and is available
    const tenant = await Tenant.findByPk(tenant_id, { transaction });
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Tenant record not found.' });
    }
    if (tenant.status !== 'available') {
      await transaction.rollback();
      return res.status(409).json({ message: 'The selected tenant already has an active booking and is not available.' });
    }

    // 2. Find the flat and verify ownership and availability
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

    // 3. Create the new booking
    const newBooking = await Booking.create({
      flat_id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      security_amount,
      security_type,
      status: 'active', // Set booking status
    }, { transaction });

    // 4. Update tenant's ledger with the security deposit
    const [ledger] = await Ledger.findOrCreate({
      where: { tenant_id },
      defaults: { tenant_id, balance: 0.00, deposit: 0.00 },
      transaction,
    });
    await ledger.increment('deposit', { by: parseFloat(security_amount), transaction });

    // 5. Update the flat's status to 'occupied'
    await flat.update({ flatStatus: 'occupied' }, { transaction });

    // 6. Update the tenant's status to 'occupied'
    await tenant.update({ status: 'occupied' }, { transaction });

    await transaction.commit();

    const completeBooking = await Booking.findByPk(newBooking.id, {
      include: [
        { model: Flat, as: 'flat', include: [{ model: Property, as: 'property' }] },
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] }, // 👈 REMOVED 'email'
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
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'phone_number'] }, // 👈 REMOVED 'email'
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Authorization check
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
      search,
      sortBy = 'start_date',
      sortOrder = 'DESC'
    } = req.query;

    // --- Build Where Clause ---
    const whereClause = {};
    const flatWhereClause = { company_id: company_id }; // Core filter

    if (search) {
      const keywordQuery = { [Op.like]: `%${search}%` };
      whereClause[Op.or] = [
        { '$tenant.name$': keywordQuery },
        { '$tenant.phone_number$': keywordQuery },
        { '$flat.title$': keywordQuery },
        { '$flat.unit_number$': keywordQuery },
        { '$flat.property.name$': keywordQuery },
      ];
    }

    // --- Build Order Clause ---
    const validSortColumns = ['start_date', 'end_date', 'monthly_rent', 'created_at'];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'start_date';
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const order = finalSortBy === 'monthly_rent'
      ? [[db.sequelize.literal('CAST(monthly_rent AS DECIMAL(12,2))'), finalSortOrder]]
      : [[finalSortBy, finalSortOrder]];

    // --- Pagination ---
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
      subQuery: false, // Important for searching on nested associations
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
 * Updates an existing booking record.
 */
exports.updateBooking = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const company_id = req.user.employee.company_id;

    const { error } = updateBookingSchema.validate(req.body);
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

    // Note: Ledger adjustments on update can be complex.
    // This example just updates the booking. A full implementation might need to
    // calculate differences in rent/deposit and create ledger entries.
    await booking.update(req.body, { transaction });

    await transaction.commit();
    res.status(200).json({ message: 'Booking updated successfully.', booking });

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

    // Adjust ledger: remove the security deposit associated with this booking
    const ledger = await Ledger.findOne({ where: { tenant_id: booking.tenant_id }, transaction });
    if (ledger) {
      await ledger.decrement('deposit', { by: parseFloat(booking.security_amount), transaction });
    }

    // Set the flat's status back to 'available'
    const flat = await Flat.findByPk(booking.flat_id, { transaction });
    if (flat) {
      await flat.update({ flatStatus: 'available' }, { transaction });
    }

    // Set the tenant's status back to 'available'
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
