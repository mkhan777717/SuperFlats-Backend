const db = require('../models');
const logger = require('../utils/logger');
const Payment = db.Payment;
const Lease = db.Lease;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;

// Create a new payment record
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { lease_id, amount, currency, method } = req.body;

    const lease = await Lease.findByPk(lease_id, {
        include: [{ 
            model: Listing, 
            as: 'listing', 
            include: [{ model: Property, as: 'property' }]
        }]
    });

    if (!lease) {
      return res.status(404).json({ message: 'Lease not found.' });
    }
    
    // CRITICAL SECURITY FIX: Only the owner or admin can create a payment record
    const isOwner = lease.listing.property.owner_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
        logger.warn(`Unauthorized attempt to create payment for lease ID ${lease_id} by user ID ${userId}.`);
        return res.status(403).json({ message: 'You are not authorized to create payments.' });
    }

    const newPayment = await Payment.create({
      lease_id,
      payer_id: lease.tenant_id, // Get the payer ID securely from the lease tenant
      amount,
      currency,
      method,
      status: 'completed',
    });

    logger.info(`New payment of ${amount} ${currency} recorded for lease ID: ${lease_id}`);
    res.status(201).json({ message: 'Payment recorded successfully.', payment: newPayment });

  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get all payments for a specific lease
exports.getPaymentsByLease = async (req, res) => {
  try {
    const { leaseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const lease = await Lease.findByPk(leaseId, {
        include: [{
            model: Listing,
            as: 'listing',
            include: [{ model: Property, as: 'property' }]
        }]
    });

    if (!lease) {
        return res.status(404).json({ message: 'Lease not found.' });
    }

    const isTenant = lease.tenant_id === userId;
    const isOwner = lease.listing.property.owner_id === userId;
    const isAdminOrAgent = userRole === 'admin' || userRole === 'agent';

    if (!isTenant && !isOwner && !isAdminOrAgent) {
        logger.warn(`Unauthorized attempt to view payments for lease ID ${leaseId} by user ID ${userId}.`);
        return res.status(403).json({ message: 'You are not authorized to view payments for this lease.' });
    }

    const payments = await Payment.findAll({
      where: { lease_id: leaseId },
      include: [
        { model: Lease, as: 'lease' },
        // FIX: Replaced 'username' with 'name' to match your User model.
        { model: User, as: 'payer', attributes: ['id', 'name', 'email'] },
      ],
      order: [['payment_date', 'DESC']],
    });

    if (!payments.length) {
      return res.status(200).json([]);
    }

    res.status(200).json(payments);

  } catch (error) {
    logger.error(`Error fetching payments for lease ${req.params.leaseId}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Update a payment record (e.g., from pending to completed)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const allowedStatuses = ['pending', 'completed', 'failed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status.' });
    }

    const payment = await Payment.findByPk(id, {
        include: [{ 
            model: Lease, 
            as: 'lease', 
            include: [{ 
                model: Listing, 
                as: 'listing',
                include: [{ model: Property, as: 'property' }]
            }] 
        }]
    });
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    // CRITICAL SECURITY FIX: Only the owner, agent, or admin can update the status
    const isOwner = payment.lease.listing.property.owner_id === userId;
    const isAdminOrAgent = userRole === 'admin' || userRole === 'agent';

    if (!isOwner && !isAdminOrAgent) {
        logger.warn(`Unauthorized attempt to update payment ID ${id} by user ID ${userId}.`);
        return res.status(403).json({ message: 'You are not authorized to update this payment.' });
    }

    payment.status = status;
    await payment.save();

    logger.info(`Payment ID ${id} status updated to: ${status}`);
    res.status(200).json({ message: 'Payment status updated successfully.', payment });

  } catch (error) {
    logger.error(`Error updating payment status for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get a single payment by ID
exports.getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const payment = await Payment.findByPk(id, {
            include: [
                { 
                    model: Lease, 
                    as: 'lease',
                    include: [{
                        model: Listing,
                        as: 'listing',
                        include: [{ model: Property, as: 'property' }]
                    }]
                },
                { model: User, as: 'payer', attributes: ['id', 'email'] },
            ],
        });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }
        
        // CRITICAL SECURITY FIX: Only authorized users can view a payment
        const isPayer = payment.payer_id === userId;
        const isOwner = payment.lease.listing.property.owner_id === userId;
        const isAdminOrAgent = userRole === 'admin' || userRole === 'agent';

        if (!isPayer && !isOwner && !isAdminOrAgent) {
            logger.warn(`Unauthorized attempt to view payment ID ${id} by user ID ${userId}.`);
            return res.status(403).json({ message: 'You are not authorized to view this payment.' });
        }

        res.status(200).json(payment);
    } catch (error) {
        logger.error(`Error fetching payment with ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};
