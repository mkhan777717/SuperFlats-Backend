const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const Appointment = db.Appointment;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const { updateAppointmentStatusSchema } = require('../utils/validator');

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

// Assign an employee to an appointment without changing status
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

    // No need for status check if you're not changing the status
    // If you want to prevent changes on 'cancelled' or 'completed'
    // you would add a check here, for example:
    // if (appointment.status === 'cancelled' || appointment.status === 'completed') {
    //   return res.status(400).json({ message: 'Cannot assign employee to a cancelled or completed appointment.' });
    // }


    // 1. Update ONLY the employee_id
    appointment.employee_id = employee_id;
    // 2. Remove the line that updates the status
    await appointment.save();

    // 3. IMPORTANT: Fetch the updated appointment with its associations
    const updatedAppointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profile_image', 'phone_number', 'role'] // Corrected field name
        },
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'profile_image', 'phone_number', 'role'] // Corrected field name
        }
      ]
    });

    logger.info(`Appointment ${id} assigned to employee ${employee_id} by user from company ${userCompanyId}.`);
    // 4. Send the complete, updated appointment object
    res.status(200).json({ message: 'Appointment assigned successfully.', appointment: updatedAppointment });

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

    const { error } = updateAppointmentStatusSchema.validate(req.body);
    if (error) {
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
// Get all appointments for a user or company with optional filters
exports.getAppointments = async (req, res) => {
  try {
    const { id: userId, role: userRole, company_id: userCompanyId } = req.user;
    // Extract the optional employeeId from the query parameters
    const { employeeId } = req.query;

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

    // New logic: If an employeeId is provided, filter the appointments
    // This is only allowed for admins/agents who can manage others' schedules
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

// Delete an appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: userRole, company_id: userCompanyId } = req.user;

    // Authorization: Only admins and agents are allowed to delete appointments
    if (userRole !== 'admin' && userRole !== 'agent') {
      return res.status(403).json({ message: 'You are not authorized to delete appointments.' });
    }

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // SECURITY CHECK: Ensure the appointment belongs to the user's company
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


// The corrected updateAppointment function
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { listing_id, scheduled_at } = req.body;
    const { role: userRole, company_id: userCompanyId } = req.user;


    // Authorization: Only admins and agents can update appointments
    if (userRole !== 'admin' && userRole !== 'agent') {
      return res.status(403).json({ message: 'You are not authorized to update appointments.' });
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

    // Check if the new listing exists and is active (if listing_id is provided)
    if (listing_id) {
      const listing = await Listing.findByPk(listing_id);
      if (!listing || listing.status !== 'active') {
        return res.status(404).json({ message: 'The new listing is not found or is not active.' });
      }
    }

    // Check for a scheduling conflict for the new date/time on the same or new listing
    if (scheduled_at || listing_id) {
      const targetListingId = listing_id || appointment.listing_id;
      const targetScheduledAt = scheduled_at || appointment.scheduled_at;

      const existingAppointment = await Appointment.findOne({
        where: {
          listing_id: targetListingId,
          scheduled_at: targetScheduledAt,
          id: { [Op.not]: id }, // Exclude the current appointment from the check
          [Op.or]: [
            { status: 'pending' },
            { status: 'confirmed' },
          ],
        },
      });

      if (existingAppointment) {
        return res.status(409).json({ message: 'This time slot is already booked for this listing. Please choose a different time.' });
      }
    }

    // Update fields if they are provided in the request body
    if (listing_id) {
      appointment.listing_id = listing_id;
    }

    if (scheduled_at) {
      // Corrected logic: create a new Date object from the string and then format it
      const date = new Date(scheduled_at);
      appointment.scheduled_at = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    await appointment.save();

    logger.info(`Appointment ${id} updated by user from company ${userCompanyId}.`);
    res.status(200).json({ message: 'Appointment updated successfully.', appointment });
  } catch (error) {
    logger.error(`Error updating appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};