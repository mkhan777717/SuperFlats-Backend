const Joi = require('joi');

// Joi schema for user registration data
const userRegistrationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone_number: Joi.string().pattern(/^[0-9]+$/).required().messages({
    'string.pattern.base': 'Phone number must contain only numbers.'
  }),
});
const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required(),
});

// Joi schema for creating a new property
const createPropertySchema = Joi.object({
  name: Joi.string().min(5).required(),
  description: Joi.string().optional().allow(''),

  address: Joi.string().min(2).required(),
  city: Joi.string().min(2).required(),
  state: Joi.string().min(2).required(),
  zipcode: Joi.string().length(6).required().pattern(/^[0-9]+$/),

  count_1rk: Joi.number().integer().required().default(0).min(0),
  count_1bhk: Joi.number().integer().required().default(0).min(0),
  count_2bhk: Joi.number().integer().required().default(0).min(0),
  count_3bhk: Joi.number().integer().required().default(0).min(0),
  count_3bhk_plus: Joi.number().integer().required().default(0).min(0),

  area_sqft: Joi.number().positive().min(1).optional(),
  parking: Joi.boolean().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  is_managed: Joi.boolean().optional()
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
  email: Joi.string().email().optional(),
  phone_number: Joi.string().pattern(/^[0-9]+$/).optional().messages({
    'string.pattern.base': 'Phone number must contain only numbers.'
  }),
  joined_at: Joi.date().iso().optional(),
});

// Joi schema for updating a tenant
const updateTenantSchema = Joi.object({
  name: Joi.string().optional(),
  phone_number: Joi.string().pattern(/^[0-9]+$/).optional().messages({
    'string.pattern.base': 'Phone number must contain only numbers.'
  }),
  email: Joi.string().email().optional(),
  joined_at: Joi.date().iso().optional(),
});

// Joi schema for employee creation data
const employeeCreationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone_number: Joi.string().pattern(/^[0-9]+$/).required().messages({
    'string.pattern.base': 'Phone number must contain only numbers.'
  }),
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



// Joi schema for validating a new lease creation request
const createLeaseSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required(),
  tenant_id: Joi.number().integer().positive().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
  monthly_rent: Joi.number().precision(2).positive().required(),
  security_deposit: Joi.number().precision(2).positive().required(),
  status: Joi.string().valid('active', 'in_active').required(),
});

// Joi schema for validating a lease update request
const updateLeaseSchema = Joi.object({
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
  monthly_rent: Joi.number().precision(2).positive().optional(),
  security_deposit: Joi.number().precision(2).positive().optional(),
  status: Joi.string().valid('active', 'in_active').optional(),
});

// Joi schema for creating a new ledger entry
const createLedgerEntrySchema = Joi.object({
  description: Joi.string().min(5).required(),
  amount: Joi.number().precision(2).positive().required(),
  type: Joi.string().valid('income', 'expense').required(),
  category: Joi.string().optional().default('Uncategorized'),
  date: Joi.date().iso().required(),
});

// Joi schema for updating a ledger entry
const updateLedgerEntrySchema = Joi.object({
  description: Joi.string().min(5).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(),
  category: Joi.string().optional(),
  date: Joi.date().iso().optional(),
}).min(1); // Ensure at least one field is provided for update

// Joi schema for creating a new Flat entity (UPDATED)
const createFlatSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().optional().allow(''),
  unit_number: Joi.string().trim().uppercase().min(1).required(),
  type: Joi.string().valid('1RK', '1BHK', '2BHK', '3BHK', '3BHK+').required(),
  area_sqft: Joi.number().precision(2).optional().allow(null), // Changed to allow decimal
  flatStatus: Joi.string().valid('available', 'occupied', 'maintenance').optional().default('available'),
  unique_amenities: Joi.array().items(Joi.string()).optional(),
});

// Joi schema for updating a Flat entity (NEW)
const updateFlatSchema = Joi.object({
  title: Joi.string().min(3).optional(),
  description: Joi.string().optional().allow(''),
  unit_number: Joi.string().trim().uppercase().min(1).optional(),
  type: Joi.string().valid('1RK', '1BHK', '2BHK', '3BHK', '3BHK+').optional(),
  area_sqft: Joi.number().precision(2).optional().allow(null),
  flatStatus: Joi.string().valid('available', 'occupied', 'maintenance').optional(),
  unique_amenities: Joi.array().items(Joi.string()).optional(),
}).min(1);


module.exports = {
  userRegistrationSchema,
  createPropertySchema,
  createListingSchema,
  employeeCreationSchema,
  updateEmployeeRoleSchema,
  createAppointmentSchema,
  createTenantSchema,
  updateTenantSchema,
  createLeaseSchema,
  updateLeaseSchema,
  updateAppointmentStatusSchema,
  createLedgerEntrySchema,
  updateLedgerEntrySchema,
  createFlatSchema,
  updateFlatSchema
};