// tasks/rentScheduler.js (Restored for Production Monthly Use)
const cron = require('node-cron');
const db = require('../models');
const { Op } = require('sequelize');
const Booking = db.Booking;
const Ledger = db.Ledger;
const LedgerEntry = db.LedgerEntry;
const logger = require('../utils/logger');

/**
 * Creates a monthly rent charge entry for all active bookings.
 */
const createMonthlyRentCharge = async () => {
    const transaction = await db.sequelize.transaction();
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();
    
    // Define the date range for the current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of the current month

    try {
        // 1. Find all active bookings
        const activeBookings = await Booking.findAll({
            where: {
                status: 'active',
                start_date: { [Op.lte]: now },
                [Op.or]: [
                    { end_date: { [Op.is]: null } },
                    { end_date: { [Op.gte]: now } }
                ],
            },
            attributes: ['id', 'tenant_id', 'monthly_rent'],
            transaction,
        });

        let newChargesCount = 0;

        for (const booking of activeBookings) {
            const tenantId = booking.tenant_id;
            const rentAmount = parseFloat(booking.monthly_rent);

            const existingCharge = await LedgerEntry.findOne({
                where: {
                    tenant_id: tenantId,
                    type: 'expense',
                    category: 'Rent',
                    date: { [Op.between]: [monthStart, monthEnd] }
                },
                transaction
            });

            if (existingCharge) {
                logger.info(`Scheduler: Rent already charged for tenant ${tenantId} for ${currentMonth}. Skipping.`);
                continue; 
            }

            const tenantLedger = await Ledger.findOne({
                where: { tenant_id: tenantId },
                transaction
            });

            if (!tenantLedger) {
                logger.warn(`Scheduler: Ledger not found for tenant ${tenantId}. Skipping rent charge.`);
                continue;
            }

            await LedgerEntry.create({
                tenant_id: tenantId,
                description: `Monthly Rent Charge (${currentMonth} ${currentYear})`,
                amount: rentAmount,
                type: 'expense',
                category: 'Rent', 
                date: now.toISOString().split('T')[0],
            }, { transaction });

            let newBalance = parseFloat(tenantLedger.balance) - rentAmount;
            await tenantLedger.update({ balance: newBalance }, { transaction });

            newChargesCount++;
        }

        await transaction.commit();
        logger.info(`Scheduler: Successfully created ${newChargesCount} rent charges for ${currentMonth}.`);

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error('CRON JOB ERROR: Failed to create monthly rent charges:', error);
    }
};

/**
 * Schedules the task to run at 00:00 (midnight) on the 1st day of every month.
 */
exports.startRentScheduler = () => {
    cron.schedule('0 0 1 * *', () => { 
        logger.info('Scheduler: Running monthly rent charge job.');
        createMonthlyRentCharge();
    }, {
        timezone: "UTC" 
    });
    logger.info('Scheduler: Monthly rent charge job started (Runs 1st of month at 00:00 UTC).');
};