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
      user_id: userId,
      company_id: companyId, // Associate the appointment with the listing's company
      scheduled_at,
      status: 'non_assigned',
    });

    logger.info(`New appointment created for user ${userId} on listing ${listing_id}`);
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
    const { role: userRole, company_id: userCompanyId } = req.user;

    // Only admins and agents can assign employees
    if (userRole !== 'admin' && userRole !== 'agent') {
      return res.status(403).json({ message: 'You are not authorized to assign employees to appointments.' });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // SECURITY CHECK: Ensure the appointment belongs to the user's company
    if (appointment.company_id !== userCompanyId) {
      logger.warn(`User from company ${userCompanyId} attempted to assign employee to appointment ${id} from a different company.`);
      return res.status(403).json({ message: 'You are not authorized to manage this appointment.' });
    }

    // An employee can only be assigned to a 'non_assigned' appointment
    if (appointment.status !== 'non_assigned') {
      return res.status(400).json({ message: 'This appointment has already been assigned or handled.' });
    }

    const employee = await User.findByPk(employee_id);
    if (!employee || employee.role !== 'agent' || employee.company_id !== userCompanyId) {
      return res.status(404).json({ message: 'Employee not found, invalid role, or belongs to a different company.' });
    }

    appointment.employee_id = employee_id;
    appointment.status = 'assigned';
    await appointment.save();

    logger.info(`Appointment ${id} assigned to employee ${employee_id} by user from company ${userCompanyId}.`);
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
    const { id: userId, role: userRole, company_id: userCompanyId } = req.user;

    const allowedStatuses = ['confirmed', 'cancelled', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // SECURITY CHECK: Ensure the appointment belongs to the user's company
    if (appointment.company_id !== userCompanyId) {
      logger.warn(`User from company ${userCompanyId} tried to update appointment ${id} from a different company.`);
      return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
    }

    // Authorization logic for who can update the status
    if (userRole === 'client') {
      // Clients can only cancel their own appointments
      if (appointment.user_id !== userId || status !== 'cancelled') {
        logger.warn(`Unauthorized client ${userId} attempted to update appointment ${id} to status: ${status}.`);
        return res.status(403).json({ message: 'You are only authorized to cancel your own appointments.' });
      }
    } else if (userRole !== 'admin' && userRole !== 'agent') {
      // Only admins and agents can update all statuses
      return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
    }

    appointment.status = status;
    await appointment.save();

    logger.info(`Appointment ${id} status updated to: ${status} by user ${userId}.`);
    res.status(200).json({ message: 'Appointment status updated successfully.', appointment });

  } catch (error) {
    logger.error(`Error updating appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get all appointments for a user or company
exports.getAppointments = async (req, res) => {
  try {
    const { id: userId, role: userRole, company_id: userCompanyId } = req.user;

    let whereClause = {};
    if (userRole === 'client') {
      // Clients can only see their own appointments
      whereClause = { user_id: userId };
    } else if (userRole === 'agent') {
      // Agents can see all appointments they are assigned to
      whereClause = { employee_id: userId };
    } else {
      // Admins and others can see all appointments for their company
      whereClause = { company_id: userCompanyId };
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
      logger.info(`No appointments found for user ${userId} in company ${userCompanyId}.`);
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
    const { id: userId, role: userRole, company_id: userCompanyId } = req.user;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Authorization: Check if the user is a client and owns the appointment, or if they are from the same company
    if (userRole === 'client') {
      if (appointment.user_id !== userId) {
        logger.warn(`Unauthorized client ${userId} tried to view appointment ID ${id}.`);
        return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
      }
    } else if (appointment.company_id !== userCompanyId) {
      logger.warn(`User from company ${userCompanyId} tried to view appointment ${id} from a different company.`);
      return res.status(403).json({ message: 'You are not authorized to view this appointment.' });
    }

    // Now that authorization is confirmed, fetch the full details
    const fullAppointment = await Appointment.findByPk(id, {
      include: [
        { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
        { model: User, as: 'user' },
        { model: User, as: 'employee' },
      ],
    });

    res.status(200).json(fullAppointment);
  } catch (error) {
    logger.error(`Error fetching appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};