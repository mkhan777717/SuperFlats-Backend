// tasks/rentScheduler.js (Restored for Production Monthly Use)
const cron = require('node-cron');
const db = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const Booking = db.Booking;
const RentBill = db.RentBill;

/**
 * Creates a monthly rent bill for all active bookings.
 */
const generateMonthlyBills = async () => {
    const transaction = await db.sequelize.transaction();
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
        // 1. Find all bookings that are active during the current month
        const activeBookings = await Booking.findAll({
            where: {
                status: 'active',
                start_date: { [Op.lte]: new Date(now.getFullYear(), now.getMonth() + 1, 0) }, // Started before or during this month
                [Op.or]: [
                    { end_date: { [Op.is]: null } },
                    { end_date: { [Op.gte]: currentMonthStart } } // Ends during or after this month
                ],
            },
            transaction,
        });

        let newBillsCount = 0;

        for (const booking of activeBookings) {
            // 2. Check if a bill for this month already exists for this booking
            const existingBill = await RentBill.findOne({
                where: {
                    booking_id: booking.id,
                    bill_month: currentMonthStart,
                },
                transaction,
            });

            if (existingBill) {
                logger.info(`Scheduler: Bill for ${currentMonthStr} already exists for booking ${booking.id}. Skipping.`);
                continue;
            }

            // 3. Create the new rent bill
            await RentBill.create({
                booking_id: booking.id,
                tenant_id: booking.tenant_id,
                amount: booking.monthly_rent,
                bill_month: currentMonthStart,
                is_paid: false,
            }, { transaction });

            newBillsCount++;
        }

        await transaction.commit();
        logger.info(`Scheduler: Successfully created ${newBillsCount} new rent bills for ${currentMonthStr}.`);

    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        logger.error('CRON JOB ERROR: Failed to generate monthly rent bills:', error);
    }
};


/**
 * Schedules the task to run at 00:00 (midnight) on the 1st day of every month.
 */
exports.startRentScheduler = () => {
    // Production schedule: '0 0 1 * *' (1st of every month)
    // Testing schedule every 5 minutes: '*/5 * * * *'
    cron.schedule('0 0 1 * *', () => {
        logger.info('Scheduler: Running monthly rent bill generation job.');
        generateMonthlyBills();
    }, {
        timezone: "UTC"
    });
    logger.info('Scheduler: Monthly rent bill job started (Runs 1st of month at 00:00 UTC).');
};