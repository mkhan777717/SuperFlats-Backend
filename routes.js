const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controllers
const authController = require('./controllers/authController');
const propertyController = require('./controllers/propertyController');
const appointmentController = require('./controllers/appointmentController');
const groupedListingController = require('./controllers/groupedListingController');
const paymentController = require('./controllers/paymentController');
const employeeController = require('./controllers/employeeController');
const listingController = require('./controllers/listingController');
const leaseController = require('./controllers/leaseController');
const userController = require('./controllers/userController'); // New user controller

// Import middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

// Set up multer for file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// -------------------- Auth Routes --------------------
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// -------------------- User Routes --------------------
// All user profile management routes moved to a dedicated section
router.get('/user/me', authMiddleware, userController.getProfile);
router.post(
  '/user/upload-profile-image',
  authMiddleware,
  upload.single('profile_image'),
  userController.uploadProfileImage
);
router.put('/user/me', authMiddleware, userController.updateProfile);
router.delete('/user/remove-profile-image', authMiddleware, userController.removeProfileImage);
router.put('/user/update-password', authMiddleware, userController.updatePassword);

// -------------------- Property Routes --------------------
router.post(
  '/properties',
  authMiddleware,
  roleMiddleware('admin', 'agent'),
  propertyController.createProperty
);
router.get('/properties/search', propertyController.searchAndFilterProperties);
router.get('/properties/:id', propertyController.getPropertyById);
router.get('/properties', propertyController.getAllProperties);
router.patch(
  '/properties/:id',
  authMiddleware,
  roleMiddleware('admin'),
  propertyController.updateProperty
);
router.delete('/properties/:id', authMiddleware, roleMiddleware('admin'), propertyController.deleteProperty);
router.post('/properties/upload-photo/:id', authMiddleware, upload.single('photo'), propertyController.uploadPhoto);
// Delete a single photo from a property
router.delete(
  '/properties/:propertyId/photos/:photoId',
  authMiddleware,
  roleMiddleware('admin', 'agent'),
  propertyController.deletePhoto
);
// -------------------- Listing Routes --------------------
router.post('/listings', authMiddleware, roleMiddleware('agent', 'admin'), listingController.createListing);
router.get('/listings/search', listingController.searchListings);
router.get('/listings', listingController.getAllListings);
router.get('/listings/:id', listingController.getListingById);
// IMPROVED: Added role middleware for explicit security
router.patch('/listings/:id', authMiddleware, roleMiddleware('admin'), listingController.updateListing);
// IMPROVED: Added role middleware for explicit security
router.delete('/listings/:id', authMiddleware, roleMiddleware('admin'), listingController.deleteListing);


// -------------------- Appointment Routes --------------------
router.post('/appointments', authMiddleware, roleMiddleware('client', 'admin'), appointmentController.createAppointment);
// IMPROVED: Simplified middleware. Controller handles the user-specific check.
router.get('/appointments/me', authMiddleware, appointmentController.getUserAppointments);
router.put('/appointments/:id/status', authMiddleware, roleMiddleware('client', 'agent', 'admin'), appointmentController.updateAppointmentStatus);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);


// -------------------- Payment Routes --------------------
router.post('/payments', authMiddleware, roleMiddleware('admin'), paymentController.createPayment);
router.get('/payments/lease/:leaseId', authMiddleware, roleMiddleware('client', 'admin', 'agent'), paymentController.getPaymentsByLease);
router.put('/payments/:id/status', authMiddleware, roleMiddleware('admin', 'agent'), paymentController.updatePaymentStatus);


// -------------------- Employee Routes --------------------
router.post('/employees', authMiddleware, roleMiddleware('admin'), employeeController.createEmployee);
router.get('/employees', authMiddleware, roleMiddleware('admin', 'manager'), employeeController.getAllEmployees);
router.get('/employees/:id', authMiddleware, roleMiddleware('admin', 'manager'), employeeController.getEmployeeById);
router.put('/employees/:id/role', authMiddleware, roleMiddleware('admin'), employeeController.updateEmployeeRole);
router.delete('/employees/:id', authMiddleware, roleMiddleware('admin'), employeeController.deleteEmployee);


// -------------------- Grouped Listing Routes --------------------
router.post('/grouped-listings', authMiddleware, roleMiddleware('admin'), groupedListingController.createGroupedListing);
router.get('/grouped-listings', groupedListingController.getAllGroupedListings);
router.get('/grouped-listings/:id', groupedListingController.getGroupedListingById);
router.patch('/grouped-listings/:id', authMiddleware, roleMiddleware('admin'), groupedListingController.updateGroupedListing);
router.delete('/grouped-listings/:id', authMiddleware, roleMiddleware('admin'), groupedListingController.deleteGroupedListing);


// -------------------- Lease Routes --------------------
router.post('/leases', authMiddleware, roleMiddleware('admin'), leaseController.createLease);
router.get('/leases', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.getAllLeases);
router.get('/leases/me', authMiddleware, roleMiddleware('client'), leaseController.getLeasesByTenant);
router.get('/leases/:id', authMiddleware, roleMiddleware('client', 'admin', 'agent'), leaseController.getLeaseById);
router.put('/leases/:id', authMiddleware, roleMiddleware('admin'), leaseController.updateLease);
router.delete('/leases/:id', authMiddleware, roleMiddleware('admin'), leaseController.deleteLease);


module.exports = router;
