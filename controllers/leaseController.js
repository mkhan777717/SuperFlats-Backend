const db = require('../models');
const logger = require('../utils/logger');
const Lease = db.Lease;
const Listing = db.Listing;
const Property = db.Property;
const User = db.User;
const { Op } = require('sequelize');

/**
 * Creates a new lease record.
 * This is an administrative action handled by owners or admins.
 */
exports.createLease = async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.user;
        const { listing_id, tenant_id, start_date, end_date, rent_amount, deposit_amount } = req.body;

        // Security check: Only an owner of the property or an admin can create a lease.
        const listing = await Listing.findByPk(listing_id, {
            include: [{ model: Property, as: 'property' }]
        });
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        const isOwner = listing.property.owner_id === userId;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isAdmin) {
            logger.warn(`Unauthorized attempt to create lease for listing ${listing_id} by user ID ${userId}.`);
            return res.status(403).json({ message: 'You are not authorized to create a lease for this listing.' });
        }

        // Additional validation
        if (listing.status === 'closed') {
            return res.status(400).json({ message: 'This listing is already leased and cannot be leased again.' });
        }

        const tenant = await User.findByPk(tenant_id);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found.' });
        }

        // Ensure the tenant has the 'tenant' role
        if (tenant.role !== 'tenant') {
            return res.status(400).json({ message: 'The specified user is not a tenant.' });
        }

        // Create the new lease record
        const newLease = await Lease.create({
            listing_id,
            tenant_id,
            start_date,
            end_date,
            rent_amount,
            deposit_amount,
            status: 'active',
        });

        // Update the listing status to 'closed'
        await listing.update({ status: 'closed' });

        logger.info(`New lease created for listing ${listing_id} with tenant ${tenant_id}.`);
        res.status(201).json({ message: 'Lease created successfully.', lease: newLease });

    } catch (error) {
        logger.error('Error creating lease:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a single lease record by its ID.
 */
exports.getLeaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role: userRole } = req.user;

        const lease = await Lease.findByPk(id, {
            include: [
                { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
                // FIX: Removed 'username' as it's not a known column. Assuming 'email' is sufficient.
                { model: User, as: 'tenant', attributes: ['id', 'email'] },
            ],
        });

        if (!lease) {
            return res.status(404).json({ message: 'Lease not found.' });
        }

        // Security check: Only the tenant on the lease, the property owner, or an admin/agent can view it.
        const isTenant = lease.tenant_id === userId;
        const isOwner = lease.listing.property.owner_id === userId;
        const isAdminOrAgent = userRole === 'admin' || userRole === 'agent';

        if (!isTenant && !isOwner && !isAdminOrAgent) {
            logger.warn(`Unauthorized attempt to view lease ${id} by user ID ${userId}.`);
            return res.status(403).json({ message: 'You are not authorized to view this lease.' });
        }

        res.status(200).json(lease);
    } catch (error) {
        logger.error(`Error fetching lease ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves a list of all leases.
 * This is an administrative function.
 */
exports.getAllLeases = async (req, res) => {
    try {
        const leases = await Lease.findAll({
            include: [
                { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
                // FIX: Removed 'username' as it's not a known column. Assuming 'email' is sufficient.
                { model: User, as: 'tenant', attributes: ['id', 'email'] },
            ],
        });

        res.status(200).json(leases);
    } catch (error) {
        logger.error('Error fetching all leases:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Retrieves leases for the authenticated tenant.
 * This is the tenant's view of their own leases.
 */
exports.getLeasesByTenant = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const leases = await Lease.findAll({
            where: { tenant_id: userId },
            include: [
                { model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] },
                // FIX: Removed 'username' as it's not a known column. Assuming 'email' is sufficient.
                { model: User, as: 'tenant', attributes: ['id', 'email'] },
            ],
        });
        res.status(200).json(leases);
    } catch (error) {
        logger.error(`Error fetching leases for user ${req.user.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


/**
 * Updates an existing lease record.
 * This is an administrative action.
 */
exports.updateLease = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role: userRole } = req.user;
        const { start_date, end_date, rent_amount, deposit_amount, status } = req.body;

        const lease = await Lease.findByPk(id, {
            include: [{ model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] }]
        });
        if (!lease) {
            return res.status(404).json({ message: 'Lease not found.' });
        }

        const isOwner = lease.listing.property.owner_id === userId;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isAdmin) {
            logger.warn(`Unauthorized attempt to update lease ${id} by user ID ${userId}.`);
            return res.status(403).json({ message: 'You are not authorized to update this lease.' });
        }

        await lease.update({ start_date, end_date, rent_amount, deposit_amount, status });

        logger.info(`Lease ${id} updated.`);
        res.status(200).json({ message: 'Lease updated successfully.', lease });

    } catch (error) {
        logger.error(`Error updating lease ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Deletes a lease record.
 * This is an administrative action for admins and property owners.
 */
exports.deleteLease = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role: userRole } = req.user;

        // Find the lease and its associated property owner
        const lease = await Lease.findByPk(id, {
            include: [{ model: Listing, as: 'listing', include: [{ model: Property, as: 'property' }] }]
        });

        if (!lease) {
            return res.status(404).json({ message: 'Lease not found.' });
        }

        const isOwner = lease.listing.property.owner_id === userId;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isAdmin) {
            logger.warn(`Unauthorized attempt to delete lease ${id} by user ID ${userId}.`);
            return res.status(403).json({ message: 'You are not authorized to delete this lease.' });
        }

        // Find the associated listing and set its status back to active
        const listing = await Listing.findByPk(lease.listing_id);
        if (listing) {
            await listing.update({ status: 'active' });
        }

        await lease.destroy();

        logger.info(`Lease ${id} deleted by user ID ${userId}.`);
        res.status(200).json({ message: 'Lease deleted successfully.' });

    } catch (error) {
        logger.error(`Error deleting lease ${req.params.id}:`, error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};