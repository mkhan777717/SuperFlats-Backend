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
const userController = require('./controllers/userController');
const tenantController = require('./controllers/tenantController'); // New tenant controller
const ledgerController = require('./controllers/ledgerController'); // New ledger controller

// Import middlewares
const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

// Set up multer for file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// -------------------- Auth Routes --------------------
router.post('/auth/admin/register', authController.registerAdmin);
router.post('/auth/admin/login', authController.loginAdmin);
router.post('/auth/register', authController.registerClient);
router.post('/auth/login', authController.loginClient);

// -------------------- User Routes --------------------
// Routes for managing the currently authenticated user's profile
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
router.get('/properties/me', authMiddleware, roleMiddleware('admin', 'agent'), propertyController.getAllOwnProperties);
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
router.get('/listings/me', authMiddleware, roleMiddleware('agent', 'admin'), listingController.getMyListings);
router.get('/listings/properties', authMiddleware, roleMiddleware('admin', 'agent'), listingController.getAvailablePropertiesForListing);
router.get('/listings/:id', listingController.getListingById);
router.patch('/listings/:id', authMiddleware, roleMiddleware('admin'), listingController.updateListing);
router.delete('/listings/:id', authMiddleware, roleMiddleware('admin'), listingController.deleteListing);


// -------------------- Appointment Routes --------------------
router.post('/appointments', authMiddleware, roleMiddleware('client'), appointmentController.createAppointment);
router.put('/appointments/:id/assign', authMiddleware, roleMiddleware('admin', 'agent'), appointmentController.assignEmployee); // New endpoint for assigning employee
router.get('/appointments/me', authMiddleware, appointmentController.getAppointments);
router.put('/appointments/:id/status', authMiddleware, roleMiddleware('client', 'agent', 'admin'), appointmentController.updateAppointmentStatus);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);


// // -------------------- Payment Routes --------------------
// router.post('/payments', authMiddleware, roleMiddleware('admin'), paymentController.createPayment);
// router.get('/payments/lease/:leaseId', authMiddleware, roleMiddleware('client', 'admin', 'agent'), paymentController.getPaymentsByLease);
// router.put('/payments/:id/status', authMiddleware, roleMiddleware('admin', 'agent'), paymentController.updatePaymentStatus);


// -------------------- Employee Routes --------------------
// Updated route to get all employees for the authenticated user's company
router.post('/employees', authMiddleware, roleMiddleware('admin'), employeeController.createEmployee);
router.get('/employees/', authMiddleware, roleMiddleware('admin', 'agent'), employeeController.getEmployeesByCompany);
router.get('/employees/:id', authMiddleware, roleMiddleware('admin', 'agent'), employeeController.getEmployeeById);
router.put('/employees/:id/role', authMiddleware, roleMiddleware('admin'), employeeController.updateEmployeeRole);
router.delete('/employees/:id', authMiddleware, roleMiddleware('admin'), employeeController.deleteEmployee);


// -------------------- Grouped Listing Routes --------------------
router.post('/grouped-listings', authMiddleware, roleMiddleware('admin'), groupedListingController.createGroupedListing);
router.get('/grouped-listings', groupedListingController.getAllGroupedListings);
router.get('/grouped-listings/:id', groupedListingController.getGroupedListingById);
router.patch('/grouped-listings/:id', authMiddleware, roleMiddleware('admin'), groupedListingController.updateGroupedListing);
router.delete('/grouped-listings/:id', authMiddleware, roleMiddleware('admin'), groupedListingController.deleteGroupedListing);


// -------------------- Lease Routes --------------------
router.post('/leases', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.createLease);
router.get('/leases', authMiddleware, roleMiddleware('admin', 'agent', 'client'), leaseController.getAllLeases);
router.get('/leases/:id', authMiddleware, roleMiddleware('admin', 'agent', 'client'), leaseController.getLeaseById);
router.put('/leases/:id', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.updateLease);
router.delete('/leases/:id', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.deleteLease);

// -------------------- Tenant Routes --------------------
router.post('/tenants', authMiddleware, roleMiddleware('admin'), tenantController.createTenant);
router.get('/tenants', authMiddleware, roleMiddleware('admin'), tenantController.getAllTenants);
router.get('/tenants/:id', authMiddleware, roleMiddleware('admin'), tenantController.getTenantById);
router.put('/tenants/:id', authMiddleware, roleMiddleware('admin'), tenantController.updateTenantProfile);
router.delete('/tenants/:id', authMiddleware, roleMiddleware('admin'), tenantController.deleteTenant);

// -------------------- Ledger Routes (Admin-Only) --------------------
router.get('/ledgers/tenants/:tenantId/summary', authMiddleware, roleMiddleware('admin'), ledgerController.getLedgerByTenantId);
router.get('/ledgers/tenants/:tenantId/entries', authMiddleware, roleMiddleware('admin'), ledgerController.getAllEntries);
router.get('/ledgers/tenants/:tenantId/entries/:entryId', authMiddleware, roleMiddleware('admin'), ledgerController.getEntryById);
router.post('/ledgers/tenants/:tenantId/entries', authMiddleware, roleMiddleware('admin'), ledgerController.createEntry);
router.put('/ledgers/tenants/:tenantId/entries/:entryId', authMiddleware, roleMiddleware('admin'), ledgerController.updateEntry);
router.delete('/ledgers/tenants/:tenantId/entries/:entryId', authMiddleware, roleMiddleware('admin'), ledgerController.deleteEntry);

module.exports = router;
