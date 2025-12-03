const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const RentBill = db.RentBill;
const Tenant = db.Tenant;
const Booking = db.Booking;
const Property = db.Property;
const Flat = db.Flat;
/**
 * Marks a specific rent bill as paid.
 */
exports.markBillAsPaid = async (req, res) => {
    try {
        const { billId } = req.params;
        const company_id = req.user.employee.company_id;

        const bill = await RentBill.findOne({
            where: { id: billId },
            include: [{ model: Tenant, as: 'tenant', where: { company_id } }]
        });

        if (!bill) {
            return res.status(404).json({ message: 'Rent bill not found or you are not authorized to modify it.' });
        }

        if (bill.is_paid) {
            return res.status(400).json({ message: 'This bill has already been marked as paid.' });
        }

        await bill.update({
            is_paid: true,
            payment_date: new Date()
        });

        logger.info(`Rent bill ${billId} marked as paid.`);
        res.status(200).json({ message: 'Rent bill marked as paid successfully.', bill });

    } catch (error) {
        logger.error(`Error marking bill ${req.params.billId} as paid:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Reverts a rent bill to unpaid status.
 */
exports.markBillAsUnpaid = async (req, res) => {
    try {
        const { billId } = req.params;
        const company_id = req.user.employee.company_id;

        const bill = await RentBill.findOne({
            where: { id: billId },
            include: [{ model: Tenant, as: 'tenant', where: { company_id } }]
        });

        if (!bill) {
            return res.status(404).json({ message: 'Rent bill not found or you are not authorized to modify it.' });
        }

        if (!bill.is_paid) {
            return res.status(400).json({ message: 'This bill is already marked as unpaid.' });
        }

        await bill.update({
            is_paid: false,
            payment_date: null
        });

        logger.info(`Rent bill ${billId} reverted to unpaid.`);
        res.status(200).json({ message: 'Rent bill reverted to unpaid successfully.', bill });

    } catch (error) {
        logger.error(`Error reverting bill ${req.params.billId} to unpaid:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a paginated rent history for a specific tenant.
 */
exports.getRentHistoryForTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        const company_id = req.user.employee.company_id;

        const tenant = await Tenant.findOne({ where: { id: tenantId, company_id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found.' });
        }

        const finalLimit = parseInt(limit);
        const finalOffset = parseInt(offset);

        const totalDue = await RentBill.sum('amount', {
            where: {
                tenant_id: tenantId,
                is_paid: false
            }
        });

        const { count, rows } = await RentBill.findAndCountAll({
            where: { tenant_id: tenantId },
            order: [['bill_month', 'DESC']],
            include: [{ model: Booking, as: 'booking', attributes: ['id'] }],
            limit: finalLimit,
            offset: finalOffset,
        });

        res.status(200).json({
            total_due: totalDue || 0,
            totalItems: count,
            totalPages: Math.ceil(count / finalLimit),
            currentPage: Math.floor(finalOffset / finalLimit) + 1,
            history: rows
        });

    } catch (error) {
        logger.error(`Error fetching rent history for tenant ${req.params.tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Calculates and retrieves the total outstanding balance for a specific tenant.
 */
exports.getTotalDueForTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const company_id = req.user.employee.company_id;

        const tenant = await Tenant.findOne({ where: { id: tenantId, company_id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found or you are not authorized.' });
        }

        const totalDue = await RentBill.sum('amount', {
            where: {
                tenant_id: tenantId,
                is_paid: false
            }
        });

        res.status(200).json({
            tenant_id: parseInt(tenantId),
            total_due: totalDue || 0
        });

    } catch (error) {
        logger.error(`Error calculating total due for tenant ${req.params.tenantId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a paginated list of ALL tenants for a specific property,
 * ordered by who has the highest outstanding balance.
 */

exports.getTenantsWithDueByProperty = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const company_id = req.user.employee.company_id;
        const { limit = 10, offset = 0, keywords } = req.query;

        const property = await Property.findOne({ where: { id: propertyId, company_id } });
        if (!property) {
            return res.status(404).json({ message: 'Property not found or you are not authorized.' });
        }

        const finalLimit = parseInt(limit);
        const finalOffset = parseInt(offset);

        const baseWhere = {
            company_id: company_id,
            property_id: propertyId
        };

        if (keywords) {
            const searchTerm = `%${keywords.toLowerCase()}%`;

            baseWhere[Op.or] = [
                { name: { [Op.like]: searchTerm } },
                { phone_number: { [Op.like]: searchTerm } }
            ];
        }

        const { count, rows } = await Tenant.findAndCountAll({
            attributes: [
                'id',
                'name',
                'phone_number',
                [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('rent_bills.amount')), 0), 'total_due']
            ],
            where: baseWhere,
            include: [
                {
                    // 👇 ADD BOOKINGS INCLUDE TO FILTER TENANTS WITH ACTIVE BOOKINGS
                    model: Booking,
                    as: 'bookings',
                    attributes: ['id', 'flat_id', 'status'],
                    where: { status: 'active' }, // Only active bookings
                    required: true, // INNER JOIN - only tenants with active bookings
                    include: [{
                        model: Flat,
                        as: 'flat',
                        attributes: ['id', 'unit_number'],
                        required: true // Ensure the flat exists
                    }]
                },
                {
                    model: RentBill,
                    as: 'rent_bills',
                    attributes: [],
                    where: { is_paid: false },
                    required: false // LEFT JOIN - include tenants even if they have no unpaid bills
                }
            ],
            group: ['Tenant.id', 'bookings.id', 'bookings->flat.id'], // 👈 ADD BOOKING AND FLAT TO GROUP BY
            order: [[db.sequelize.col('total_due'), 'DESC']],
            limit: finalLimit,
            offset: finalOffset,
            subQuery: false
        });

        const totalItems = count.length;

        res.status(200).json({
            totalItems: totalItems,
            totalPages: Math.ceil(totalItems / finalLimit),
            currentPage: Math.floor(finalOffset / finalLimit) + 1,
            tenants: rows
        });

    } catch (error) {
        logger.error(`Error fetching tenants with due for property ${req.params.propertyId}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Retrieves a paginated list of all rent bills for the company, with filters.
 */
exports.getAllRentBills = async (req, res) => {
    try {
        const company_id = req.user.employee.company_id;
        const {
            limit = 10,
            offset = 0,
            is_paid,
            propertyId,
            month,
            sortBy = 'bill_month',
            sortOrder = 'DESC'
        } = req.query;

        const whereClause = {};
        const tenantWhereClause = { company_id };
        const flatWhereClause = {};

        if (is_paid !== undefined) {
            whereClause.is_paid = is_paid === 'true';
        }

        if (month) {
            const startDate = new Date(`${month}-01`);
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            whereClause.bill_month = { [Op.between]: [startDate, endDate] };
        }

        if (propertyId) {
            flatWhereClause.property_id = propertyId;
        }

        const { count, rows } = await RentBill.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Tenant,
                    as: 'tenant',
                    where: tenantWhereClause,
                    attributes: ['id', 'name']
                },
                {
                    model: Booking,
                    as: 'booking',
                    attributes: ['id'],
                    required: true,
                    include: [{
                        model: Flat,
                        as: 'flat',
                        where: flatWhereClause,
                        required: true,
                        attributes: ['id', 'unit_number'],
                        include: [{
                            model: Property,
                            as: 'property',
                            attributes: ['id', 'name']
                        }]
                    }]
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sortBy, sortOrder.toUpperCase()]],
            distinct: true,
            subQuery: false,
        });

        res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: Math.floor(offset / limit) + 1,
            bills: rows,
        });

    } catch (error) {
        logger.error('Error fetching all rent bills:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


exports.getPropertiesSummary = async (req, res) => {
    try {
        if (!req.user || !req.user.employee || !req.user.employee.company_id) {
            return res.status(403).json({ message: 'User is not associated with a company.' });
        }

        const company_id = req.user.employee.company_id;

        const rentSummary = await db.Property.findAll({
            where: { company_id: company_id, is_managed: true },
            attributes: [
                'id',
                'name',
                [
                    db.sequelize.literal(`SUM(CASE WHEN \`tenants->bookings->rent_bills\`.\`is_paid\` = TRUE THEN 1 ELSE 0 END)`),
                    'totalPaidCount'
                ],
                [
                    db.sequelize.literal(`SUM(CASE WHEN \`tenants->bookings->rent_bills\`.\`is_paid\` = FALSE THEN 1 ELSE 0 END)`),
                    'totalUnpaidCount'
                ],
                [
                    db.sequelize.literal(`SUM(CASE WHEN \`tenants->bookings->rent_bills\`.\`is_paid\` = FALSE THEN \`tenants->bookings->rent_bills\`.\`amount\` ELSE 0 END)`),
                    'totalOutstandingAmount'
                ],
            ],
            include: [
                {
                    model: db.Tenant,
                    as: 'tenants',
                    attributes: [],
                    required: false,
                    include: [{
                        model: db.Booking,
                        as: 'bookings',
                        attributes: [],
                        required: false,
                        where: { status: 'active' },
                        include: [{
                            model: db.RentBill,
                            as: 'rent_bills',
                            attributes: [],
                            required: false,
                        }]
                    }]
                },
                {
                    model: db.Photo,
                    as: 'photos',
                    required: false,
                    where: { imageable_type: 'Property', is_primary: true }
                },
            ],
            group: ['Property.id', 'Property.name', 'photos.id'], // 👈 ADD 'Property.name' to GROUP BY
            order: [['name', 'ASC']]
        });

        const finalSummary = rentSummary.reduce((acc, property) => {
            // 👇 IMPROVED PHOTO HANDLING
            let photos = [];
            if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
                // If photos is an array with actual photo objects
                photos = property.photos;
            } else if (property.photos && !Array.isArray(property.photos)) {
                // If photos is a single photo object (not an array)
                photos = [property.photos];
            }
            // If no photos or empty array, photos remains []

            acc.push({
                id: property.id,
                name: property.name,
                photos: photos, // 👈 This will be [] when empty, not [[]]
                totalPaidCount: parseInt(property.dataValues.totalPaidCount, 10) || 0,
                totalUnpaidCount: parseInt(property.dataValues.totalUnpaidCount, 10) || 0,
                totalOutstandingAmount: parseFloat(property.dataValues.totalOutstandingAmount) || 0.00,
            });

            return acc;
        }, []);

        res.status(200).json({ properties: finalSummary });

    } catch (error) {
        console.error('Error fetching rent payment summary:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};