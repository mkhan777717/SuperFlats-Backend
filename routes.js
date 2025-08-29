const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controllers
const authController = require('./controllers/authController');
const propertyController = require('./controllers/propertyController');
const appointmentController = require('./controllers/appointmentController');
const paymentController = require('./controllers/paymentController');
const employeeController = require('./controllers/employeeController');

// Import middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

// Set up multer for file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// -------------------- Auth Routes --------------------
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getProfile);
router.post(
  '/auth/upload-profile-image',
  authMiddleware,
  upload.single('profile_image'),
  authController.uploadProfileImage
);

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
router.get('/payments/lease/:leaseId', authMiddleware, roleMiddleware('tenant', 'owner', 'admin'), paymentController.getPaymentsByLease);
router.put('/payments/:id/status', authMiddleware, roleMiddleware('admin', 'manager'), paymentController.updatePaymentStatus);


// -------------------- Employee Routes --------------------
router.post('/employees', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.createEmployee);
router.get('/employees', authMiddleware, roleMiddleware('owner', 'admin', 'manager'), employeeController.getAllEmployees);
router.get('/employees/:id', authMiddleware, roleMiddleware('owner', 'admin', 'manager'), employeeController.getEmployeeById);
router.put('/employees/:id/role', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.updateEmployeeRole);
router.delete('/employees/:id', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.deleteEmployee);

module.exports = router;
