const Joi = require('joi');

// Joi schema for user registration data
const userRegistrationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone_number: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Phone number must be exactly 10 digits.'
  }),
});

// Joi schema for creating a new appointment
const createAppointmentSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required(),
  scheduled_at: Joi.date().iso().required(),
});

// Joi schema for updating an appointment
const updateAppointmentSchema = Joi.object({
  listing_id: Joi.number().integer().positive().optional(),
  scheduled_at: Joi.date().iso().optional(),
}).min(1);

// Joi schema for assigning an employee to an appointment
const assignEmployeeSchema = Joi.object({
  employee_id: Joi.number().integer().positive().required(),
});


const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required(),
});

// Joi schema for patching an appointment (replaces other update schemas)
const patchAppointmentSchema = Joi.object({
  listing_id: Joi.number().integer().positive().optional(),
  scheduled_at: Joi.date().iso().optional(),
  employee_id: Joi.number().integer().positive().optional().allow(null),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').optional(),
  feedback: Joi.string().max(2000).optional().allow(null, ''),
}).min(1).messages({
  'object.min': 'At least one field to update must be provided.'
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
  is_managed: Joi.boolean().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
});


// Joi schema for creating a new listing (UPDATED)
const createListingSchema = Joi.object({
  flat_id: Joi.number().integer().positive().required(),
  title: Joi.string().min(5).required(),
  description: Joi.string().min(10).optional().allow(''),
  monthly_rent: Joi.number().precision(2).positive().required(),
  security_amount: Joi.number().precision(2).min(0).required(),
  security_type: Joi.string().valid('lease', 'deposit').required(),
  status: Joi.string().valid('active', 'closed', 'pending').optional().default('pending'),
});

// Joi schema for updating a listing (NEW)
const updateListingSchema = Joi.object({
  title: Joi.string().min(5).optional(),
  description: Joi.string().min(10).optional().allow(''),
  monthly_rent: Joi.number().precision(2).positive().optional(),
  security_amount: Joi.number().precision(2).min(0).optional(),
  security_type: Joi.string().valid('lease', 'deposit').optional(),
  status: Joi.string().valid('active', 'closed', 'pending').optional(),
}).min(1);


// Joi schema for creating a new booking
const createBookingSchema = Joi.object({
  flat_id: Joi.number().integer().positive().required(),
  tenant_id: Joi.number().integer().positive().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
  monthly_rent: Joi.number().precision(2).positive().required(),
  security_amount: Joi.number().precision(2).min(0).required(),
  security_type: Joi.string().valid('lease', 'deposit').required(),
});

// Joi schema for updating a booking
const updateBookingSchema = Joi.object({
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
  monthly_rent: Joi.number().precision(2).positive().optional(),
  security_amount: Joi.number().precision(2).min(0).optional(),
  security_type: Joi.string().valid('lease', 'deposit').optional(),
  status: Joi.string().valid('active', 'ended', 'cancelled').optional(), 
}).min(1);


// Joi schema for creating a new tenant
const createTenantSchema = Joi.object({
  property_id: Joi.number().integer().positive().required(),
  name: Joi.string().min(2).max(100).required(),
  phone_number: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
    'string.pattern.base': 'Phone number must be between 10 and 15 digits.'
  }),
  status: Joi.string().valid('available', 'occupied').optional(),
});

// Joi schema for updating a tenant
const updateTenantSchema = Joi.object({
  property_id: Joi.number().integer().positive().optional(),
  name: Joi.string().min(2).max(100).optional(),
  phone_number: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
    'string.pattern.base': 'Phone number must be between 10 and 15 digits.'
  }),
  status: Joi.string().valid('available', 'occupied').optional(),
}).min(1);


// Joi schema for uploading an ID proof
const idProofUploadSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
});

// Joi schema for creating a new employee
const employeeCreationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone_number: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
    'string.pattern.base': 'Phone number must be between 10 and 15 digits.'
  }),
  role: Joi.string().valid('agent', 'admin').required(),
});

// Joi schema for updating an employee's role
const updateEmployeeRoleSchema = Joi.object({
  role: Joi.string().valid('agent', 'admin').required(),
});


// Joi schema for creating a new ledger entry
const createLedgerEntrySchema = Joi.object({
  tenant_id: Joi.number().integer().required(),
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
  area_sqft: Joi.number().precision(2).optional().allow(null),
  flat_status: Joi.string().valid('available', 'occupied', 'maintenance').optional().default('available'),
  unique_amenities: Joi.array().items(Joi.string()).optional(),
});

// Joi schema for updating a Flat entity (NEW)
const updateFlatSchema = Joi.object({
  title: Joi.string().min(3).optional(),
  description: Joi.string().optional().allow(''),
  unit_number: Joi.string().trim().uppercase().min(1).optional(),
  type: Joi.string().valid('1RK', '1BHK', '2BHK', '3BHK', '3BHK+').optional(),
  area_sqft: Joi.number().precision(2).optional().allow(null),
  flat_status: Joi.string().valid('available', 'occupied', 'maintenance').optional(),
  unique_amenities: Joi.array().items(Joi.string()).optional(),
}).min(1);


module.exports = {
  userRegistrationSchema,
  createPropertySchema,
  createListingSchema,
  updateListingSchema,
  createBookingSchema,
  updateBookingSchema,
  employeeCreationSchema,
  updateEmployeeRoleSchema,
  createAppointmentSchema,
  patchAppointmentSchema, // The new consolidated schema
  createTenantSchema,
  updateTenantSchema,
  idProofUploadSchema,
  createLedgerEntrySchema,
  updateLedgerEntrySchema,
  createFlatSchema,
  updateFlatSchema
};