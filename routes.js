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

// Import middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');
const bodyParserMiddleware = require('./utils/bodyParserMiddleware');

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
router.put('/auth/me', authMiddleware, authController.updateProfile);
router.delete('/auth/remove-profile-image', authMiddleware, authController.removeProfileImage);

// -------------------- Property Routes --------------------
router.post(
  '/properties', // CORRECTED: Removed '.'
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  upload.fields([{ name: 'photos', maxCount: 10 }]),
  bodyParserMiddleware,
  propertyController.createProperty
);
router.get('/properties/search', propertyController.searchAndFilterProperties);
router.get('/properties/:id', propertyController.getPropertyById);
router.get('/properties', propertyController.getAllProperties);
router.patch(
  '/properties/:id', // CORRECTED: Removed '.'
  authMiddleware,
  roleMiddleware('owner', 'admin'),
  upload.fields([{ name: 'photos', maxCount: 10 }]),
  bodyParserMiddleware,
  propertyController.updateProperty
);
router.delete('/properties/:id', authMiddleware, roleMiddleware('owner', 'admin'), propertyController.deleteProperty); // CORRECTED: Removed '.'
router.post('/properties/upload-photo', authMiddleware, upload.single('photo'), propertyController.uploadPhoto);


// -------------------- Listing Routes --------------------
router.post('/listings', authMiddleware, roleMiddleware('owner', 'admin'), listingController.createListing); // Requires authentication and specific role
router.get('/listings/search', listingController.searchListings); // ADDED: Search route for listings
router.get('/listings', listingController.getAllListings); // Public route
router.get('/listings/:id', listingController.getListingById); // Public route
router.patch('/listings/:id', authMiddleware, listingController.updateListing); // Requires authentication for the specific lister
router.delete('/listings/:id', authMiddleware, listingController.deleteListing); // Requires authentication for the specific lister


// -------------------- Appointment Routes --------------------
router.post('/appointments', authMiddleware, roleMiddleware('tenant', 'owner'), appointmentController.createAppointment);
router.get('/appointments/me', authMiddleware, roleMiddleware('tenant', 'owner', 'agent', 'admin'), appointmentController.getUserAppointments);
router.put('/appointments/:id/status', authMiddleware, roleMiddleware('tenant', 'agent', 'owner', 'admin'), appointmentController.updateAppointmentStatus);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);


// -------------------- Payment Routes --------------------
router.post('/payments', authMiddleware, roleMiddleware('owner', 'admin'), paymentController.createPayment);
// CRITICAL FIX: Agents should also be able to view payments.
router.get('/payments/lease/:leaseId', authMiddleware, roleMiddleware('tenant', 'owner', 'admin', 'agent'), paymentController.getPaymentsByLease);
// CRITICAL FIX: A tenant should NOT be able to update a payment status.
router.put('/payments/:id/status', authMiddleware, roleMiddleware('owner', 'admin', 'agent'), paymentController.updatePaymentStatus);


// -------------------- Employee Routes --------------------
router.post('/employees', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.createEmployee);
router.get('/employees', authMiddleware, roleMiddleware('owner', 'admin', 'manager'), employeeController.getAllEmployees); // UPDATED: Added manager role
router.get('/employees/:id', authMiddleware, roleMiddleware('owner', 'admin', 'manager'), employeeController.getEmployeeById); // UPDATED: Added manager role
router.put('/employees/:id/role', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.updateEmployeeRole);
router.delete('/employees/:id', authMiddleware, roleMiddleware('owner', 'admin'), employeeController.deleteEmployee);


// -------------------- Grouped Listing Routes --------------------
router.post('/grouped-listings', authMiddleware, roleMiddleware('admin', 'owner'), groupedListingController.createGroupedListing);
router.get('/grouped-listings', groupedListingController.getAllGroupedListings);
router.get('/grouped-listings/:id', groupedListingController.getGroupedListingById);
router.patch('/grouped-listings/:id', authMiddleware, roleMiddleware('admin', 'owner'), groupedListingController.updateGroupedListing);
router.delete('/grouped-listings/:id', authMiddleware, roleMiddleware('admin', 'owner'), groupedListingController.deleteGroupedListing);


// -------------------- Lease Routes --------------------
router.post('/leases', authMiddleware, roleMiddleware('owner', 'admin'), leaseController.createLease);
router.get('/leases', authMiddleware, roleMiddleware('owner', 'admin', 'agent'), leaseController.getAllLeases);
router.get('/leases/me', authMiddleware, roleMiddleware('tenant'), leaseController.getLeasesByTenant);
router.get('/leases/:id', authMiddleware, roleMiddleware('tenant', 'owner', 'admin', 'agent'), leaseController.getLeaseById);
router.put('/leases/:id', authMiddleware, roleMiddleware('owner', 'admin'), leaseController.updateLease);
router.delete('/leases/:id', authMiddleware, roleMiddleware('admin', 'owner'), leaseController.deleteLease);


module.exports = router;