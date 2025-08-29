// routes.js

const express = require('express');
const router = express.Router();
const multer = require('multer'); // Import multer

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
// We use memoryStorage so the file buffer is available for sharp and Firebase
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// -------------------- Auth Routes --------------------
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getProfile); // CORRECTED: Added /auth prefix
router.post(
  '/auth/upload-profile-image',
  authMiddleware, // Ensure the user is authenticated
  upload.single('profile_image'), // Middleware to handle a single file with the field name 'profile_image'
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
router.put('/appointments/:id/status', authMiddleware, roleMiddleware('agent', 'admin'), appointmentController.updateAppointmentStatus); // CORRECTED: Removed manager
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);


// -------------------- Payment Routes --------------------
router.post('/payments', authMiddleware, roleMiddleware('tenant', 'owner'), paymentController.createPayment);
router.get('/payments/lease/:leaseId', authMiddleware, roleMiddleware('tenant', 'owner', 'admin'), paymentController.getPaymentsByLease); // CORRECTED: Removed manager
router.put('/payments/:id/status', authMiddleware, roleMiddleware('admin'), paymentController.updatePaymentStatus); // CORRECTED: Removed manager


// -------------------- Employee Routes --------------------
// These are protected and typically for 'admin' or 'owner' roles as well
router.post('/employees', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.createEmployee); // CORRECTED: Added owner role
router.get('/employees', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.getAllEmployees); // CORRECTED: Added owner role and removed manager
router.get('/employees/:id', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.getEmployeeById); // CORRECTED: Added owner role and removed manager
router.put('/employees/:id/role', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.updateEmployeeRole); // CORRECTED: Added owner role


module.exports = router;
