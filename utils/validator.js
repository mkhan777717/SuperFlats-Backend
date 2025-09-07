const Joi = require('joi');

// Joi schema for user registration data
// The role is hardcoded in the controller to prevent privilege escalation.
const userRegistrationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('client', 'admin', 'agent').required(),
});

// Joi schema for creating a new property
const createPropertySchema = Joi.object({
  title: Joi.string().min(5).required(),
  description: Joi.string().min(20).required(),
  property_type: Joi.string().valid('apartment', 'villa', 'office', 'land').required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zipcode: Joi.string().required(),
  features: Joi.object({
    bedrooms: Joi.number().integer().min(0),
    bathrooms: Joi.number().integer().min(0),
    area_sqft: Joi.number().positive(),
    furnishing: Joi.string().valid('furnished', 'semi-furnished', 'unfurnished'),
    parking: Joi.boolean(),
    amenities: Joi.string().allow(''), // Allow an empty string for amenities
  }).optional(),
    isManaged: Joi.boolean()
});

// Joi schema for creating a new listing
const createListingSchema = Joi.object({
  property_id: Joi.number().integer().required(),
  lister_id: Joi.number().integer().required(),
  title: Joi.string().min(5).required(),
  description: Joi.string().min(20).required(),
  price: Joi.number().positive(),
  lease_expected_amount: Joi.number().positive(),
  deposit_expected_amount: Joi.number().positive(),
  status: Joi.string().valid('active', 'pending', 'closed').required(),
});

// Joi schema for creating a new tenant
const createTenantSchema = Joi.object({
  name: Joi.string().required(),
  contact_info: Joi.string().allow('').optional(),
  joinDate: Joi.date().iso().optional(), // Now optional for creation
});

// Joi schema for updating a tenant
const updateTenantSchema = Joi.object({
  name: Joi.string().optional(),
  contact_info: Joi.string().allow('').optional(),
  joinDate: Joi.date().iso().optional(),
});

// Joi schema for employee creation data
const employeeCreationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('agent', 'admin').required(),
});

// Joi schema for updating an employee's role
const updateEmployeeRoleSchema = Joi.object({
  role: Joi.string().valid('agent', 'admin').required(),
});

// Joi schema for creating a new appointment
const createAppointmentSchema = Joi.object({
  listing_id: Joi.number().integer().required(),
  scheduled_at: Joi.date().iso().required(),
});

// Joi schema for creating a new grouped listing
const createGroupedListingSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().allow('').optional(),
  listing_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
});

// Joi schema for updating a grouped listing
const updateGroupedListingSchema = Joi.object({
  name: Joi.string().min(3).optional(),
  description: Joi.string().allow('').optional(),
  listing_ids: Joi.array().items(Joi.number().integer()).optional(),
});

module.exports = {
  userRegistrationSchema,
  createPropertySchema,
  createListingSchema,
  employeeCreationSchema,
  updateEmployeeRoleSchema,
  createAppointmentSchema,
  createGroupedListingSchema,
  updateGroupedListingSchema,
  createTenantSchema,
  updateTenantSchema,
};
