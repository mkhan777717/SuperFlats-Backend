// utils/validator.js

const Joi = require('joi');

// Joi schema for user registration data
const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('tenant', 'owner', 'agent').required(),
});

// Joi schema for creating a new property
const createPropertySchema = Joi.object({
  owner_id: Joi.number().integer().required(),
  title: Joi.string().min(5).required(),
  description: Joi.string().min(20).required(),
  property_type: Joi.string().valid('apartment', 'villa', 'office', 'land').required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
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


// Generic validation function
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const message = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({ error: message });
  }
  next();
};

module.exports = {
  userRegistrationSchema,
  createPropertySchema,
  createListingSchema,
  validate,
};