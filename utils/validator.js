const Joi = require('joi');

// Joi schema for user registration data
const userRegistrationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('tenant', 'owner', 'employee').required(),
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

// Joi schema for employee creation data
const employeeCreationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('agent', 'manager', 'admin').required(),
});

// Joi schema for updating an employee's role
const updateEmployeeRoleSchema = Joi.object({
  role: Joi.string().valid('agent', 'manager', 'admin').required(),
});


module.exports = {
  userRegistrationSchema,
  createPropertySchema,
  createListingSchema,
  employeeCreationSchema,
  updateEmployeeRoleSchema,
};
