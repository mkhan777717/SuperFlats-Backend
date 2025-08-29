// controllers/appointmentController.js

const db = require('../models');
const logger = require('../utils/logger');
const Appointment = db.Appointment;
const Listing = db.Listing;
const User = db.User;

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { listing_id, user_id, scheduled_at } = req.body;

    // Check if the listing exists and is active
    const listing = await Listing.findByPk(listing_id);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ message: 'Listing not found or is not active.' });
    }

    // Check if the user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
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
    const { userId } = req.params;

    const appointments = await Appointment.findAll({
      where: { user_id: userId },
      include: [
        { model: Listing, as: 'listing' },
      ],
    });

    if (!appointments.length) {
      return res.status(404).json({ message: 'No appointments found for this user.' });
    }

    res.status(200).json(appointments);

  } catch (error) {
    logger.error(`Error fetching appointments for user ${req.params.userId}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Update the status of an appointment (e.g., confirmed, cancelled)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Basic validation for allowed status values
    const allowedStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
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

        const appointment = await Appointment.findByPk(id, {
            include: [
                { model: Listing, as: 'listing' },
                { model: User, as: 'user' },
            ],
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        res.status(200).json(appointment);
    } catch (error) {
        logger.error(`Error fetching appointment ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};