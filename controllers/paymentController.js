const db = require('../models');
const logger = require('../utils/logger');
const Payment = db.Payment;
const Lease = db.Lease;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const Ledger = db.Ledger; // Added Ledger model

/**
 * Creates a new payment record.
 * This should be a record of a payment, with a default 'pending' status.
 * Only the property owner or an admin can create this record.
 */
exports.createPayment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { lease_id, amount, method } = req.body;

    const lease = await Lease.findByPk(lease_id, {
      include: [{
        model: Listing,
        as: 'listing',
        include: [{ model: Property, as: 'property' }]
      }],
      transaction
    });

    if (!lease) {
      await transaction.rollback();
      logger.warn(`Failed to create payment: Lease ID ${lease_id} not found.`);
      return res.status(404).json({ message: 'Lease not found.' });
    }

    // Security check: Verify user is the property owner or an admin
    const isOwner = lease.listing.property.owner_id === userId;


    if (!isOwner) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to create payment for lease ID ${lease_id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to create payments.' });
    }

    const newPayment = await Payment.create({
      lease_id,
      payer_id: lease.tenant_id,
      amount,
      method,
      status: 'pending', // Set status to 'pending' by default
    }, { transaction });

    await transaction.commit();
    logger.info(`New payment of ${amount} recorded as 'pending' for lease ID: ${lease_id} by user ${userId}.`);
    res.status(201).json({ message: 'Payment recorded successfully.', payment: newPayment });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves all payments for a specific lease.
 * Only the tenant, owner, or an agent/admin can view these payments.
 */
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
      logger.warn(`Failed to fetch payments: Lease ID ${leaseId} not found.`);
      return res.status(404).json({ message: 'Lease not found.' });
    }

    // Security check: Verify user is the tenant, owner, or an authorized agent/admin
    const isTenant = lease.tenant_id === userId;
    const isOwner = lease.listing.property.owner_id === userId;


    if (!isTenant && !isOwner ) {
      logger.warn(`Unauthorized attempt to view payments for lease ID ${leaseId} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to view payments for this lease.' });
    }

    const payments = await Payment.findAll({
      where: { lease_id: leaseId },
      include: [
        { model: Lease, as: 'lease' },
        { model: User, as: 'payer', attributes: ['id', 'name', 'email'] },
      ],
      order: [['payment_date', 'DESC']],
    });

    logger.info(`Retrieved ${payments.length} payments for lease ID ${leaseId} by user ${userId}.`);
    res.status(200).json(payments);

  } catch (error) {
    logger.error(`Error fetching payments for lease ${req.params.leaseId}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Updates a payment record's status and updates the ledger balance.
 * Only the property owner, an agent, or an admin can update the status.
 */
exports.updatePaymentStatus = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const allowedStatuses = ['pending', 'completed', 'failed'];
    if (!allowedStatuses.includes(status)) {
      await transaction.rollback();
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
      }],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      logger.warn(`Failed to update payment: Payment ID ${id} not found.`);
      return res.status(404).json({ message: 'Payment not found.' });
    }

    // Security check: Verify user is the owner, agent, or admin
    const isOwner = payment.lease.listing.property.owner_id === userId;

    if (!isOwner ) {
      await transaction.rollback();
      logger.warn(`Unauthorized attempt to update payment ID ${id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to update this payment.' });
    }

    if (status === 'completed' && payment.status !== 'completed') {
      const ledger = await Ledger.findOne({
        where: { tenant_id: payment.payer_id },
        transaction
      });

      if (!ledger) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Ledger not found for this tenant.' });
      }

      const newBalance = parseFloat(ledger.balance) - parseFloat(payment.amount);
      await ledger.update({ balance: newBalance }, { transaction });

      logger.info(`Ledger for tenant ${payment.payer_id} updated. New balance: ${newBalance}.`);
    }

    payment.status = status;
    await payment.save({ transaction });
    await transaction.commit();

    logger.info(`Payment ID ${id} status updated to: ${status} by user ${userId}.`);
    res.status(200).json({ message: 'Payment status updated successfully.', payment });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error updating payment status for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Retrieves a single payment record by its ID.
 * Only the payer, owner, or an agent/admin can view the payment.
 */
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
      logger.warn(`Failed to fetch payment: Payment ID ${id} not found.`);
      return res.status(404).json({ message: 'Payment not found.' });
    }

    // Security check: Verify user is the payer, owner, or an authorized agent/admin
    const isPayer = payment.payer_id === userId;
    const isOwner = payment.lease.listing.property.owner_id === userId;

    if (!isPayer && !isOwner ) {
      logger.warn(`Unauthorized attempt to view payment ID ${id} by user ID ${userId}.`);
      return res.status(403).json({ message: 'You are not authorized to view this payment.' });
    }

    logger.info(`Payment ID ${id} retrieved by user ${userId}.`);
    res.status(200).json(payment);

  } catch (error) {
    logger.error(`Error fetching payment with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
