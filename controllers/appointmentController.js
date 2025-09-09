const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const Appointment = db.Appointment;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;

// Create a new appointment with 'non_assigned' status
exports.createAppointment = async (req, res) => {
  try {
    const { listing_id, scheduled_at } = req.body;
    const user_id = req.user.id;

    // Check if the listing exists and is active
    const listing = await Listing.findByPk(listing_id);
    if (!listing || listing.status !== 'active') {
      logger.warn(`Attempted to create appointment on non-existent or inactive listing ID: ${listing_id}`);
      return res.status(404).json({ message: 'Listing not found or is not active.' });
    }

    // Check for a scheduling conflict
    const existingAppointment = await Appointment.findOne({
      where: {
        listing_id,
        scheduled_at,
        // Ensure no confirmed, pending, assigned, or non_assigned appointments exist at this time
        [Op.or]: [
          { status: 'pending' },
          { status: 'confirmed' },
          { status: 'assigned' },
          { status: 'non_assigned' }
        ]
      }
    });

    if (existingAppointment) {
      logger.warn(`Appointment conflict detected for listing ${listing_id} at ${scheduled_at}.`);
      return res.status(409).json({ message: 'This time slot is already booked. Please choose a different time.' });
    }

    const newAppointment = await Appointment.create({
      listing_id,
      user_id,
      scheduled_at,
      status: 'non_assigned', // Initial status is now 'non_assigned'
    });

    logger.info(`New appointment created for user ${user_id} on listing ${listing_id}`);
    res.status(201).json({ message: 'Appointment created successfully.', appointment: newAppointment });

  } catch (error) {
    logger.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Assign an employee to a 'non_assigned' appointment
exports.assignEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;
    const userRole = req.user.role;

    // Only admins and agents can assign employees
    if (userRole !== 'admin' && userRole !== 'agent') {
      return res.status(403).json({ message: 'You are not authorized to assign employees to appointments.' });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // An employee can only be assigned to a 'non_assigned' appointment
    if (appointment.status !== 'non_assigned') {
      return res.status(400).json({ message: 'This appointment has already been assigned or handled.' });
    }

    const employee = await User.findByPk(employee_id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found or invalid role.' });
    }

    appointment.employee_id = employee_id;
    appointment.status = 'assigned';
    await appointment.save();

    logger.info(`Appointment ${id} assigned to employee ${employee_id}.`);
    res.status(200).json({ message: 'Appointment assigned successfully.', appointment });

  } catch (error) {
    logger.error(`Error assigning employee to appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Update the status of an appointment
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const allowedStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const appointment = await Appointment.findByPk(id, {
      include: [{
        model: Listing,
        as: 'listing',
        include: [{
          model: Property,
          as: 'property'
        }]
      }]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Client can only cancel their own appointment
    if (userRole === 'client' && appointment.user_id !== userId && status !== 'cancelled') {
      logger.warn(`Unauthorized client ${userId} tried to update appointment ID ${id} to status: ${status}.`);
      return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
    } else if (userRole === 'client' && appointment.user_id !== userId && status === 'cancelled') {
      // Allow a client to cancel their own appointment
    } else if (userRole !== 'admin' && userRole !== 'agent') {
      // Only admin and agent can update statuses other than cancellation
      return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
    }


    appointment.status = status;
    await appointment.save();

    logger.info(`Appointment ${id} status updated to: ${status}`);
    res.status(200).json({ message: 'Appointment status updated successfully.', appointment });

  } catch (error) {
    logger.error(`Error updating appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get all appointments for a user
exports.getUserAppointments = async (req, res) => {
  try {

    const { id: userId } = req.user;

    const appointments = await Appointment.findAll({
      where: { user_id: userId },
      include: [
        { model: Listing, as: 'listing' },
      ],
      order: [['scheduled_at', 'DESC']]
    });

    // BETTER UX: Return an empty array instead of 404
    if (!appointments.length) {
      logger.info(`No appointments found for user ${userId}. Returning an empty array.`);
      return res.status(200).json([]);
    }

    res.status(200).json(appointments);

  } catch (error) {
    logger.error(`Error fetching appointments for user ${req.user.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get a single appointment by ID
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
        { model: User, as: 'user' },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Check if the user is authorized to view this appointment
    if (userRole === 'client' && appointment.user_id !== userId) {
      logger.warn(`Unauthorized client ${userId} tried to view appointment ID ${id}.`);
      return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
    }
    // Admin and Agent roles are implicitly allowed to proceed.

    res.status(200).json(appointment);
  } catch (error) {
    logger.error(`Error fetching appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
