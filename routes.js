// routes.js

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('./controllers/authController');
const propertyController = require('./controllers/propertyController');
const appointmentController = require('./controllers/appointmentController');
const paymentController = require('./controllers/paymentController');
const employeeController = require('./controllers/employeeController');

// Import middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

// -------------------- Auth Routes --------------------
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);


// -------------------- Property Routes --------------------
router.post('/properties', authMiddleware, roleMiddleware('owner', 'admin'), propertyController.createProperty);
router.get('/properties', propertyController.getAllProperties);
router.get('/properties/:id', propertyController.getPropertyById);
router.put('/properties/:id', authMiddleware, roleMiddleware('owner', 'admin'), propertyController.updateProperty);
router.delete('/properties/:id', authMiddleware, roleMiddleware('owner', 'admin'), propertyController.deleteProperty);


// -------------------- Appointment Routes --------------------
router.post('/appointments', authMiddleware, roleMiddleware('tenant'), appointmentController.createAppointment);
router.get('/appointments/user/:userId', authMiddleware, appointmentController.getUserAppointments);
router.put('/appointments/:id/status', authMiddleware, roleMiddleware('agent', 'manager', 'admin'), appointmentController.updateAppointmentStatus);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);


// -------------------- Payment Routes --------------------
router.post('/payments', authMiddleware, roleMiddleware('tenant', 'owner'), paymentController.createPayment);
router.get('/payments/lease/:leaseId', authMiddleware, roleMiddleware('tenant', 'owner', 'manager', 'admin'), paymentController.getPaymentsByLease);
router.put('/payments/:id/status', authMiddleware, roleMiddleware('manager', 'admin'), paymentController.updatePaymentStatus);


// -------------------- Employee Routes --------------------
// These are protected and typically for 'admin' or 'manager' roles only
router.post('/employees', authMiddleware, roleMiddleware('admin'), employeeController.createEmployee);
router.get('/employees', authMiddleware, roleMiddleware('manager', 'admin'), employeeController.getAllEmployees);
router.get('/employees/:id', authMiddleware, roleMiddleware('manager', 'admin'), employeeController.getEmployeeById);
router.put('/employees/:id/role', authMiddleware, roleMiddleware('admin'), employeeController.updateEmployeeRole);


module.exports = router;