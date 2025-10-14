const db = require('../models');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { employeeCreationSchema } = require('../utils/validator');
const { Op } = require('sequelize');
const Employee = db.Employee;
const User = db.User;
const Company = db.Company;
const { deleteFile } = require('../utils/fileService');

// Create a new employee entry and a corresponding user account
exports.createEmployee = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {

    const companyId = req.user.company_id;
    if (!companyId) {
      await transaction.rollback();
      logger.error('Unauthorized attempt to create an employee: company_id not found on request.');
      return res.status(401).json({ message: 'Unauthorized. Company ID not found.' });
    }

    // Validate request body against the Joi schema.
    const { error } = employeeCreationSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      logger.warn(`Validation failed during employee creation: ${error.details[0].message}`);
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, password, role, phone_number } = req.body;

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

    // Check if a user with the same phone number already exists
    const phoneNumberExists = await User.findOne({
      where: { phone_number },
      transaction,
    });
    if (phoneNumberExists) {
      await transaction.rollback();
      logger.warn(`Employee creation failed: Phone number '${phone_number}' is already in use.`);
      return res.status(409).json({ message: 'This phone number is already registered to an account.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1. Create the new user with the given role
    const newUser = await User.create({
      name,
      email,
      phone_number,
      role: role,
      password: hashedPassword,
    }, { transaction });

    // 2. Create the new employee record and associate it with the company
    const newEmployee = await Employee.create({
      user_id: newUser.id,
      company_id: companyId, // Link the employee to the company
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
        phone_number: newUser.phone_number,
        role: newUser.role,
      },
      employee: {
        id: newEmployee.id,
        company_id: newEmployee.company_id,
        joined_at: newEmployee.joined_at,
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
        attributes: ['id', 'name', 'email', 'phone_number', 'role', 'profile_image']
      },
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name']
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

// Get all employees for a specific company
exports.getEmployeesByCompany = async (req, res) => {
  try {
    // Assuming the authenticated user's company_id is available on the request object.
    const companyId = req.user.employee.company_id;
    console.log(companyId);
    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized. Company ID not found.' });
    }

    const employees = await Employee.findAll({
      where: { company_id: companyId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone_number', 'role', 'profile_image']
      }],
      order: [['joined_at', 'ASC']],
    });

    res.status(200).json(employees);
  } catch (error) {
    logger.error('Error fetching employees by company:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Update an employee's role by updating their user account
exports.updateEmployeeRole = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['agent', 'admin'];
    if (!allowedRoles.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid employee role.' });
    }

    const employee = await Employee.findByPk(id, { transaction });
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Find the associated user and update their role
    const user = await User.findByPk(employee.user_id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Associated user not found.' });
    }

    // If downgrading the role of an admin, ensure there is at least one other admin left.
    if (user.role === 'admin' && role !== 'admin') {
      const otherAdminsCount = await Employee.count({
        include: [{
          model: User,
          as: 'user',
          where: { role: 'admin' },
          required: true,
        }],
        where: {
          company_id: employee.company_id,
          id: { [Op.ne]: id } // Exclude the current employee from the count
        },
        transaction
      });

      if (otherAdminsCount === 0) {
        await transaction.rollback();
        logger.warn(`Failed to update role for employee ID ${id}: Cannot downgrade the last admin.`);
        return res.status(400).json({ message: 'Cannot downgrade the last admin. The company must have at least one administrator.' });
      }
    }

    user.role = role;
    await user.save({ transaction });

    await transaction.commit();
    logger.info(`User role for employee ID ${id} updated to: ${role}`);
    res.status(200).json({
      message: 'Employee role updated successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      }
    });

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
