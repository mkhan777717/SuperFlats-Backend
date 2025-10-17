const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const Appointment = db.Appointment;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const Flat = db.Flat; // 👈 ADD THIS LINE
const { createAppointmentSchema, patchAppointmentSchema } = require('../utils/validator');

// Create a new appointment with 'non_assigned' status
exports.createAppointment = async (req, res) => {
  try {
    const { error, value } = createAppointmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const { listing_id, scheduled_at } = value;
    const userId = req.user.id;

    // Check if the listing exists and is active
    const listing = await Listing.findByPk(listing_id);
    if (!listing || listing.status !== 'active') {
      logger.warn(`Attempted to create appointment on non-existent or inactive listing ID: ${listing_id}`);
      return res.status(404).json({ message: 'Listing not found or is not active.' });
    }

    // Get the company_id from the listing itself
    const companyId = listing.company_id;

    // Check for a scheduling conflict for the same listing
    const existingAppointment = await Appointment.findOne({
      where: {
        listing_id,
        scheduled_at,
        [Op.or]: [
          { status: 'pending' },
          { status: 'confirmed' },
        ]
      }
    });

    if (existingAppointment) {
      logger.warn(`Appointment conflict detected for listing ${listing_id} at ${scheduled_at}.`);
      return res.status(409).json({ message: 'This time slot is already booked. Please choose a different time.' });
    }

    const newAppointment = await Appointment.create({
      listing_id,
      user_id: userId,
      company_id: companyId, // Associate the appointment with the listing's company
      scheduled_at,
      status: 'pending',
    });

    logger.info(`New appointment created for user ${userId} on listing ${listing_id}`);
    res.status(201).json({ message: 'Appointment created successfully.', appointment: newAppointment });

  } catch (error) {
    logger.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// -------------------- CONSOLIDATED UPDATE FUNCTION --------------------

/**
 * Updates an appointment. Can handle changes to listing, time, assigned employee, and status.
 * Access is role-based:
 * - Admins/Agents can modify all fields.
 * - Clients can only cancel their own appointments.
 */
exports.updateAppointment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { id: userId, role: userRole, employee } = req.user;
    const userCompanyId = employee ? employee.company_id : null;

    // 1. Validate request body
    const { error, value } = patchAppointmentSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }
    const { listing_id, scheduled_at, employee_id, status } = value;

    // 2. Find the appointment
    const appointment = await Appointment.findByPk(id, { transaction });
    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // 3. Authorization Checks
    if (userRole === 'client') {
      if (appointment.user_id !== userId) {
        await transaction.rollback();
        return res.status(403).json({ message: 'You are not authorized to modify this appointment.' });
      }
      if (status && status !== 'cancelled') {
        await transaction.rollback();
        return res.status(403).json({ message: 'You are only permitted to cancel your appointment.' });
      }
      if (listing_id || scheduled_at || employee_id) {
        await transaction.rollback();
        return res.status(403).json({ message: 'You are not permitted to change these appointment details.' });
      }
    } else { // For 'admin' and 'agent'
      if (appointment.company_id !== userCompanyId) {
        await transaction.rollback();
        return res.status(403).json({ message: 'You are not authorized to modify this appointment.' });
      }
    }

    // 4. Logic for specific field updates (only for admin/agent)
    if (userRole === 'admin' || userRole === 'agent') {
      // Check new listing if provided
      if (listing_id) {
        const listing = await Listing.findOne({ where: { id: listing_id, company_id: userCompanyId }, transaction });
        if (!listing || listing.status !== 'active') {
          await transaction.rollback();
          return res.status(404).json({ message: 'The new listing is not found, not active, or does not belong to your company.' });
        }
        appointment.listing_id = listing_id;
      }

      // Check for scheduling conflicts
      if (scheduled_at || listing_id) {
        const conflict = await Appointment.findOne({
          where: {
            listing_id: listing_id || appointment.listing_id,
            scheduled_at: scheduled_at || appointment.scheduled_at,
            id: { [Op.not]: id },
            status: { [Op.in]: ['pending', 'confirmed'] }
          },
          transaction
        });
        if (conflict) {
          await transaction.rollback();
          return res.status(409).json({ message: 'This time slot is already booked for the listing.' });
        }
      }
      if (scheduled_at) appointment.scheduled_at = scheduled_at;

      // Assign employee
      if (employee_id !== undefined) {
        appointment.employee_id = employee_id;
      }
    }

    // 5. Update status (allowed for all authorized roles)
    if (status) {
      appointment.status = status;
    }

    await appointment.save({ transaction });
    await transaction.commit();

    const updatedAppointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [ // 👇 CORRECTED NESTED INCLUDE
            {
              model: Flat,
              as: 'flat',
              include: [{ model: Property, as: 'property' }]
            }
          ]
        },
        { model: User, as: 'user' },
        { model: User, as: 'employee' },
      ]
    });

    logger.info(`Appointment ${id} updated successfully by user ${userId}.`);
    res.status(200).json({ message: 'Appointment updated successfully.', appointment: updatedAppointment });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error updating appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const { id: userId, role: userRole, company_id: userCompanyId } = req.user;
    const { employeeId } = req.query;

    let whereClause = {};
    if (userRole === 'client') {
      whereClause = { user_id: userId };
    } else if (userRole === 'agent') {
      whereClause = { employee_id: userId };
    } else {
      whereClause = { company_id: userCompanyId };
    }
    if (employeeId && (userRole === 'admin' || userRole === 'agent')) {
      whereClause.employee_id = employeeId;
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        { model: db.Listing, as: 'listing' },
        { model: db.User, as: 'user' },
        { model: db.User, as: 'employee' },
      ],
      order: [['scheduled_at', 'DESC']]
    });

    if (!appointments.length) {
      logger.info(`No appointments found for the applied criteria.`);
      return res.status(200).json([]);
    }

    res.status(200).json(appointments);

  } catch (error) {
    logger.error(`Error fetching appointments for user ${req.user.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get a single appointment by ID
/**
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role: userRole, employee } = req.user;
    const userCompanyId = employee ? employee.company_id : null;

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [ // 👇 CORRECTED NESTED INCLUDE
            {
              model: Flat,
              as: 'flat',
              include: [{ model: Property, as: 'property' }]
            }
          ]
        },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] },
        { model: User, as: 'employee', attributes: ['id', 'name', 'email', 'phone_number'] },
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (userRole === 'client') {
      if (appointment.user_id !== userId) {
        logger.warn(`Unauthorized client ${userId} tried to view appointment ID ${id}.`);
        return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
      }
    } else if (appointment.company_id !== userCompanyId) {
      logger.warn(`User from company ${userCompanyId} tried to view appointment ${id} from a different company.`);
      return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
    }

    res.status(200).json(appointment);
  } catch (error) {
    logger.error(`Error fetching appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Delete an appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: userRole, company_id: userCompanyId } = req.user;
    if (userRole !== 'admin' && userRole !== 'agent') {
      return res.status(403).json({ message: 'You are not authorized to delete appointments.' });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (appointment.company_id !== userCompanyId) {
      logger.warn(`User from company ${userCompanyId} tried to delete appointment ${id} from a different company.`);
      return res.status(403).json({ message: 'You are not authorized to delete this appointment.' });
    }

    // Delete the appointment
    await appointment.destroy();

    logger.info(`Appointment ${id} deleted successfully by user from company ${userCompanyId}.`);
    res.status(200).json({ message: 'Appointment deleted successfully.' });

  } catch (error) {
    logger.error(`Error deleting appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};