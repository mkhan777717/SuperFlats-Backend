const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { employeeCreationSchema } = require('../utils/validator');
const Employee = db.Employee;
const User = db.User;
const { deleteFile } = require('../utils/fileService');

// Create a new employee entry and a corresponding user account
exports.createEmployee = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    // Validate request body against the Joi schema.
    const { error } = employeeCreationSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during employee creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, password, role } = req.body;

    // Check if a user with the same email already exists
    const userExists = await User.findOne({
      where: { email },
      transaction,
    });
    if (userExists) {
      await transaction.rollback();
      logger.warn(`Employee creation failed: User with this email already exists.`);
      return res.status(409).json({ message: `A user with this email already exists.` });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1. Create the new user with the generic 'employee' role
    const newUser = await User.create({
      name,
      email,
      role: 'employee',
      password: hashedPassword,
    }, { transaction });

    // 2. Create the new employee record with the specific role
    const newEmployee = await Employee.create({
      user_id: newUser.id,
      role: role,
    }, { transaction });

    // Commit the transaction
    await transaction.commit();

    logger.info(`New employee created successfully for user ID: ${newUser.id} with role: ${role}`);
    res.status(201).json({
      message: 'Employee created successfully.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      employee: {
        id: newEmployee.id,
        role: newEmployee.role,
      },
    });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
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
        attributes: ['id', 'name', 'email', 'role']
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
        attributes: ['id', 'name', 'email', 'role']
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
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['agent', 'manager', 'admin'];
    if (!allowedRoles.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid employee role.' });
    }

    const employee = await Employee.findByPk(id, { transaction });
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }

    employee.role = role;
    await employee.save({ transaction });

    const user = await User.findByPk(employee.user_id, { transaction });
    if (user) {
      user.role = 'employee';
      await user.save({ transaction });
    }

    await transaction.commit();
    logger.info(`Employee ID ${id} role updated to: ${role}`);
    res.status(200).json({ message: 'Employee role updated successfully.', employee });

  } catch (error) {
    await transaction.rollback();
    logger.error(`Error updating employee role for ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Delete an employee and their associated user account
exports.deleteEmployee = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, { transaction });
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const user = await User.findByPk(employee.user_id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found.' });
    }

    // ADDED: Delete the profile image from Firebase if it exists
    if (user.profile_image) {
      await deleteFile(user.profile_image, 'profile image');
    }

    // Delete the employee record
    await employee.destroy({ transaction });

    // Delete the associated user record
    await user.destroy({ transaction });

    await transaction.commit();
    logger.info(`Employee ID ${id} and associated user deleted successfully.`);
    res.status(200).json({ message: 'Employee and associated user deleted successfully.' });

  } catch (error) {
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    logger.error(`Error deleting employee with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
