const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize'); // Import Op for comparison operators
const Appointment = db.Appointment;
const Listing = db.Listing;
const Property = db.Property; // We'll need this to check property ownership
const User = db.User;

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { listing_id, scheduled_at } = req.body;
    // CRITICAL SECURITY FIX: Get the user_id from the authenticated token, not the request body
    const user_id = req.user.id;

    // Check if the listing exists and is active
    const listing = await Listing.findByPk(listing_id);
    if (!listing || listing.status !== 'active') {
      logger.warn(`Attempted to create appointment on non-existent or inactive listing ID: ${listing_id}`);
      return res.status(404).json({ message: 'Listing not found or is not active.' });
    }

    // Check for a scheduling conflict for the same listing at the same time
    const existingAppointment = await Appointment.findOne({
      where: {
        listing_id,
        scheduled_at,
        // Ensure no confirmed or pending appointments exist at this time
        [Op.or]: [
          { status: 'pending' },
          { status: 'confirmed' }
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
      status: 'pending',
    });

    logger.info(`New appointment created for user ${user_id} on listing ${listing_id}`);
    res.status(201).json({ message: 'Appointment created successfully.', appointment: newAppointment });

  } catch (error) {
    logger.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get all appointments for a user
exports.getUserAppointments = async (req, res) => {
  try {
    // CRITICAL SECURITY FIX: Get the user ID from the token, not the request params.
    // This prevents a user from viewing another user's appointments.
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

// Update the status of an appointment (e.g., confirmed, cancelled)
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

    const isOwner = appointment.listing.property.owner_id === userId;
    console.log(userId);
    const isAdminOrAgent = userRole === 'admin' || userRole === 'agent';

    if (!isOwner && !isAdminOrAgent) {
      logger.warn(`Unauthorized attempt to update appointment ID ${id} by user ID ${userId}.`);
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

    const isOwner = appointment.listing.property.owner_id === userId;
    const isUser = appointment.user_id === userId;
    const isAdminOrAgent = userRole === 'admin' || userRole === 'agent';

    if (!isOwner && !isUser && !isAdminOrAgent) {
      logger.warn(`Unauthorized attempt to view appointment ID ${id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
    }

    res.status(200).json(appointment);
  } catch (error) {
    logger.error(`Error fetching appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
