// controllers/paymentController.js

const db = require('../models');
const logger = require('../utils/logger');
const Payment = db.Payment;
const Lease = db.Lease;
const User = db.User;

// Create a new payment record
exports.createPayment = async (req, res) => {
  try {
    const { lease_id, payer_id, amount, currency, method } = req.body;

    // Check if the lease and payer exist
    const lease = await Lease.findByPk(lease_id);
    if (!lease) {
      return res.status(404).json({ message: 'Lease not found.' });
    }

    const payer = await User.findByPk(payer_id);
    if (!payer) {
      return res.status(404).json({ message: 'Payer not found.' });
    }
    
    // Create the new payment record
    const newPayment = await Payment.create({
      lease_id,
      payer_id,
      amount,
      currency,
      method,
      status: 'completed', // Assuming a successful payment creation
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

    const payments = await Payment.findAll({
      where: { lease_id: leaseId },
      include: [
        { model: Lease, as: 'lease' },
        { model: User, as: 'payer', attributes: ['id', 'username', 'email'] },
      ],
      order: [['payment_date', 'DESC']],
    });

    if (!payments.length) {
      return res.status(404).json({ message: 'No payments found for this lease.' });
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

    const allowedStatuses = ['pending', 'completed', 'failed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status.' });
    }

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
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
        const payment = await Payment.findByPk(id, {
            include: [
                { model: Lease, as: 'lease' },
                { model: User, as: 'payer', attributes: ['id', 'username', 'email'] },
            ],
        });

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }

        res.status(200).json(payment);
    } catch (error) {
        logger.error(`Error fetching payment with ID ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};