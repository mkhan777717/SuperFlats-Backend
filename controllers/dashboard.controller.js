const db = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
    if (!req.user || !req.user.employee || !req.user.employee.company_id) {
        return res.status(401).json({ error: 'Authentication required or user not associated with a company.' });
    }

    try {
        const company_id = req.user.employee.company_id;

        // 1. Total number of properties
        const totalProperties = await db.Property.count({
            where: { company_id }
        });

        // 2. Total number of flats
        const totalFlats = await db.Flat.count({
            where: { company_id }
        });

        // 3. Total number of active tenants (with at least one active booking)
        const activeTenants = await db.Tenant.count({
            where: { company_id },
            include: [{
                model: db.Booking,
                as: 'bookings',
                required: true,
                where: { status: 'active' }
            }]
        });

        // 4. Total number of listings
        const totalListings = await db.Listing.count({
            where: { company_id }
        });

        // 5. Total rent due (sum of unpaid rent bills)
        const totalRentDue = await db.RentBill.sum('amount', {
            where: {
                is_paid: false,
                tenant_id: {
                    [Op.in]: db.sequelize.literal(
                        `(SELECT id FROM tenants WHERE company_id = ${company_id})`
                    )
                }
            }
        });

        // 6. Number of appointments scheduled for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const appointmentsToday = await db.Appointment.count({
            where: {
                company_id,
                scheduled_at: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });

        res.status(200).json({
            totalProperties,
            totalFlats,
            activeTenants,
            totalListings,
            totalRentDue: parseFloat(totalRentDue) || 0,
            appointmentsToday
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

exports.getBusinessKpiStats = async (req, res) => {
    if (!req.user || !req.user.employee || !req.user.employee.company_id) {
        return res.status(401).json({ error: 'Authentication required or user not associated with a company.' });
    }

    try {
        const company_id = req.user.employee.company_id;

        // 1. Total Revenue This Month (all paid rent bills, security deposits, onboarding fees)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Rent revenue (paid this month)
        const rentRevenue = await db.RentBill.sum('amount', {
            where: {
                is_paid: true,
                payment_date: { [Op.gte]: firstDay, [Op.lte]: lastDay },
                tenant_id: {
                    [Op.in]: db.sequelize.literal(
                        `(SELECT id FROM tenants WHERE company_id = ${company_id})`
                    )
                }
            }
        });

        // Security deposit revenue (from bookings paid this month)
        const securityRevenue = await db.Booking.sum('security_amount', {
            where: {
                status: 'active',
                created_at: { [Op.gte]: firstDay, [Op.lte]: lastDay },
                flat_id: {
                    [Op.in]: db.sequelize.literal(
                        `(SELECT id FROM flats WHERE company_id = ${company_id})`
                    )
                }
            }
        });

        // Onboarding fees (if you have a separate model/field, sum it here; otherwise, set to 0)
        const onboardingRevenue = 0;

        const totalRevenueThisMonth = (parseFloat(rentRevenue) || 0) + (parseFloat(securityRevenue) || 0) + (parseFloat(onboardingRevenue) || 0);

        // 2. Appointments Completed
        const appointmentsCompleted = await db.Appointment.count({
            where: {
                company_id,
                status: 'completed'
            }
        });

        // 3. Appointments Canceled
        const appointmentsCanceled = await db.Appointment.count({
            where: {
                company_id,
                status: 'cancelled'
            }
        });

        // 4. New Leads This Week (new tenants created in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newLeadsThisWeek = await db.Tenant.count({
            where: {
                company_id,
                created_at: { [Op.gte]: sevenDaysAgo }
            }
        });

        res.status(200).json({
            totalRevenueThisMonth,
            appointmentsCompleted,
            appointmentsCanceled,
            newLeadsThisWeek
        });
    } catch (error) {
        console.error('Error fetching business KPI stats:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};