const { Company, Listing } = require('../models'); // Adjust paths to your models setup

const enforceListingLimitOnUpdate = async (req, res, next) => {
    try {
        const { company_id } = req.user; // Set by auth middleware
        const listingId = req.params.id; // Assuming the route is /listings/:id
        const { status: incomingStatus } = req.body; // The status they are trying to update to

        if (!company_id) {
            return res.status(400).json({ error: "Company association missing from user profile." });
        }

        // 1. Fetch the company's plan
        const company = await Company.findByPk(company_id);
        if (!company) {
            return res.status(404).json({ error: "Company not found." });
        }

        // If they are on the unlimited Org plan, skip checks entirely
        if (company.plan_type === 'org') {
            return next();
        }

        // 2. Find the listing they want to modify
        const currentListing = await Listing.findByPk(listingId);
        if (!currentListing) {
            return res.status(404).json({ error: "Listing not found." });
        }

        // 3. Determine if they are trying to ACTIVATE a non-active listing
        const isTryingToActivate =
            incomingStatus === 'active' && currentListing.status !== 'active';

        // If they are NOT trying to change the status to 'active' (e.g., just updating the description), let them pass
        if (!isTryingToActivate) {
            return next();
        }

        // 4. They ARE trying to activate a listing. Check their current active pool size.
        const activeListingCount = await Listing.count({
            where: {
                company_id,
                status: 'active'
            }
        });

        // 5. Enforce Limits against the active pool size
        if (company.plan_type === 'free' && activeListingCount >= 5) {
            return res.status(403).json({
                error: "Cannot activate listing. Free plan limit reached (Max 5 active listings). Please upgrade or close an existing listing first."
            });
        }

        if (company.plan_type === 'pro' && activeListingCount >= 15) {
            return res.status(403).json({
                error: "Cannot activate listing. Pro plan limit reached (Max 15 active listings). Please upgrade to Org or close an existing listing first."
            });
        }

        // Everything checks out
        next();

    } catch (error) {
        console.error("Error in enforceListingLimitOnUpdate middleware:", error);
        return res.status(500).json({ error: "Internal server error evaluating listing update limits." });
    }
};
const enforceListingLimit = async (req, res, next) => {
    try {
        // req.user must be populated by your authentication middleware beforehand
        const { company_id } = req.user;

        if (!company_id) {
            return res.status(400).json({ error: "Company association missing from user profile." });
        }

        // 1. Fetch the company's current subscription tier
        const company = await Company.findByPk(company_id);
        if (!company) {
            return res.status(404).json({ error: "Company not found." });
        }

        // 2. Count only the currently 'active' public listings
        const activeListingCount = await Listing.count({
            where: {
                company_id,
                status: 'active'
            }
        });

        // 3. Enforce Tier Limits
        if (company.plan_type === 'free' && activeListingCount >= 3) {
            return res.status(403).json({
                error: "Free plan limit reached. You can only have 5 active public listings. Please upgrade to Pro."
            });
        }

        if (company.plan_type === 'pro' && activeListingCount >= 15) {
            return res.status(403).json({
                error: "Pro plan limit reached. You can only have 15 active public listings. Please upgrade to Org."
            });
        }

        // If the plan is 'org' or limits aren't exceeded, move to the next function
        next();

    } catch (error) {
        console.error("Error in enforceListingLimit middleware:", error);
        return res.status(500).json({ error: "Internal server error evaluating plan limits." });
    }
};
const enforceEmployeeLimit = async (req, res, next) => {
    try {
        // req.user must be populated by your authentication middleware beforehand
        const { company_id } = req.user;

        if (!company_id) {
            return res.status(400).json({ error: "Company association missing from user profile." });
        }

        // 1. Fetch the company's current subscription tier
        const company = await Company.findByPk(company_id);
        if (!company) {
            return res.status(404).json({ error: "Company not found." });
        }

        // 2. Count how many employees this company has already added
        const totalEmployees = await Employee.count({
            where: { company_id }
        });

        // 3. Enforce Tier Limits
        // Free tier = 0 added employees allowed (Only the owner exists in Company)
        if (company.plan_type === 'free' && totalEmployees >= 0) {
            return res.status(403).json({
                error: "Your current Free plan does not allow adding employees. Please upgrade to Pro to add up to 5 team members."
            });
        }

        // Pro tier = Maximum of 5 added employees allowed
        if (company.plan_type === 'pro' && totalEmployees >= 5) {
            return res.status(403).json({
                error: "Pro plan limit reached. You can only add up to 5 employees. Please upgrade to Org for unlimited team accounts."
            });
        }

        // If the plan is 'org' or limits aren't exceeded, move forward!
        next();

    } catch (error) {
        console.error("Error in enforceEmployeeLimit middleware:", error);
        return res.status(500).json({ error: "Internal server error evaluating employee limits." });
    }
};

module.exports = {
    enforceListingLimit,
    enforceEmployeeLimit,
    enforceListingLimitOnUpdate,
};
