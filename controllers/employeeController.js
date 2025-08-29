// controllers/employeeController.js

const db = require('../models');
const logger = require('../utils/logger');
const Employee = db.Employee;
const User = db.User;

// Create a new employee entry
// This assumes a user already exists and is being promoted to an employee role.
exports.createEmployee = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    // Check if the user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the user is already an employee
    const existingEmployee = await Employee.findOne({ where: { user_id } });
    if (existingEmployee) {
      return res.status(409).json({ message: 'User is already an employee.' });
    }

    // Ensure the role is valid
    const allowedRoles = ['agent', 'manager', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid employee role.' });
    }

    // Create the new employee record
    const newEmployee = await Employee.create({
      user_id,
      role,
    });

    // Optionally, update the user's role in the users table
    // user.role = role;
    // await user.save();
    
    logger.info(`New employee created for user ID: ${user_id} with role: ${role}`);
    res.status(201).json({ message: 'Employee created successfully.', employee: newEmployee });

  } catch (error) {
    logger.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get a single employee by their ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'role'] // Exclude sensitive info like password
      }],
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    res.status(200).json(employee);

  } catch (error) {
    logger.error(`Error fetching employee with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'role']
      }],
      order: [['joined_at', 'ASC']],
    });

    res.status(200).json(employees);
  } catch (error) {
    logger.error('Error fetching all employees:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Update an employee's role
exports.updateEmployeeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['agent', 'manager', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid employee role.' });
    }

    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    employee.role = role;
    await employee.save();

    logger.info(`Employee ID ${id} role updated to: ${role}`);
    res.status(200).json({ message: 'Employee role updated successfully.', employee });

  } catch (error) {
    logger.error(`Error updating employee role for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};