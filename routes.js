const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controllers
const authController = require('./controllers/authController');
const propertyController = require('./controllers/propertyController');
const appointmentController = require('./controllers/appointmentController');
const groupedListingController = require('./controllers/groupedListingController');
const employeeController = require('./controllers/employeeController');
const listingController = require('./controllers/listingController');
const leaseController = require('./controllers/leaseController');
const userController = require('./controllers/userController');
const tenantController = require('./controllers/tenantController');
const ledgerController = require('./controllers/ledgerController');
const flatController = require('./controllers/flatController');


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
router.get('/properties/', authMiddleware, roleMiddleware('admin', 'agent'), propertyController.getProperties);
router.get('/properties/:id', propertyController.getPropertyById);
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
router.patch('/appointments/:id', authMiddleware, roleMiddleware('admin', 'agent'), appointmentController.updateAppointment)
router.put('/appointments/:id/assign', authMiddleware, roleMiddleware('admin', 'agent'), appointmentController.assignEmployee);
router.get('/appointments/me', authMiddleware, appointmentController.getAppointments);
router.put('/appointments/:id/status', authMiddleware, roleMiddleware('client', 'agent', 'admin'), appointmentController.updateAppointmentStatus);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);
router.delete('/appointments/:id', authMiddleware, roleMiddleware('admin'), appointmentController.deleteAppointment);

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
router.patch('/leases/:id', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.updateLease);
router.delete('/leases/:id', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.deleteLease);
router.get('/leases/tenants', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.getAvailableTenants);
router.get('/leases/listings', authMiddleware, roleMiddleware('admin', 'agent'), leaseController.getAvailableListings);
router.get('/leases/:id', authMiddleware, roleMiddleware('admin', 'agent', 'client'), leaseController.getLeaseById);



// -------------------- Tenant Routes --------------------
router.post('/tenants', authMiddleware, roleMiddleware('admin'), tenantController.createTenant);
router.get('/tenants', authMiddleware, roleMiddleware('admin'), tenantController.getAllTenants);
router.get('/tenants/:id', authMiddleware, roleMiddleware('admin'), tenantController.getTenantById);
router.put('/tenants/:id', authMiddleware, roleMiddleware('admin'), tenantController.updateTenant);
router.delete('/tenants/:id', authMiddleware, roleMiddleware('admin'), tenantController.deleteTenant);

// -------------------- Flats Routes --------------------
router.post('/properties/:propertyId/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.createFlat);
router.get('/properties/:propertyId/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlatsByProperty);
router.get('/flats/:flatId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlatById);
router.patch('/flats/:flatId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.updateFlat);
router.delete('/flats/:flatId', authMiddleware, roleMiddleware('admin'), flatController.deleteFlat);
// Upload a photo for a flat
router.post('/flats/:flatId/photos', authMiddleware, roleMiddleware('admin', 'agent'), upload.single('photo'), flatController.uploadFlatPhoto);

// -------------------- Ledger Routes (Admin-Only) --------------------
router.get('/ledgers/company/entries/', authMiddleware, roleMiddleware('admin'), ledgerController.getAllCompanyEntries);
router.get('/ledgers/tenants/summary', authMiddleware, roleMiddleware('admin'), ledgerController.getAllLedgerSummaries);
router.get('/ledgers/tenants/:tenantId/summary', authMiddleware, roleMiddleware('admin'), ledgerController.getLedgerSummaryByTenantId);
router.get('/ledgers/tenants/:tenantId/entries', authMiddleware, roleMiddleware('admin'), ledgerController.getAllEntries);
router.get('/ledgers/tenants/:tenantId/entries/:entryId', authMiddleware, roleMiddleware('admin'), ledgerController.getEntryById);
router.post('/ledgers/tenants/:tenantId/entries', authMiddleware, roleMiddleware('admin'), ledgerController.createEntry);
router.patch('/ledgers/tenants/:tenantId/entries/:entryId', authMiddleware, roleMiddleware('admin'), ledgerController.updateEntry);
router.delete('/ledgers/tenants/:tenantId/entries/:entryId', authMiddleware, roleMiddleware('admin'), ledgerController.deleteEntry);

module.exports = router;
