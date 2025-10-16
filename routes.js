const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controllers
const authController = require('./controllers/authController');
const propertyController = require('./controllers/propertyController');
const appointmentController = require('./controllers/appointmentController');
const employeeController = require('./controllers/employeeController');
const listingController = require('./controllers/listingController');
const userController = require('./controllers/userController');
const bookingController = require('./controllers/bookingController');
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
// NEW Public search endpoint for all active listings
router.get('/listings/public/search', listingController.publicSearchListings);
router.post('/listings', authMiddleware, roleMiddleware('agent', 'admin'), listingController.createListing);
router.get('/listings/me', authMiddleware, roleMiddleware('agent', 'admin'), listingController.getMyListings);
router.get('/listings/flats', authMiddleware, roleMiddleware('admin', 'agent'), listingController.getAvailableFlatsForListing);
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

// -------------------- Booking Routes --------------------
router.post('/bookings', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.createBooking);
router.get('/bookings', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.getAllBookings);
router.get('/bookings/:id', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.getBookingById);
router.patch('/bookings/:id', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.updateBooking);
router.delete('/bookings/:id', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.deleteBooking);


// -------------------- Tenant Routes --------------------
router.get('/tenants/available', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getAvailableTenants);
router.post('/tenants', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.createTenant);
router.get('/tenants', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getAllTenants);
router.get('/tenants/:id', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getTenantById);
router.patch('/tenants/:id', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.updateTenant);
router.delete('/tenants/:id', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.deleteTenant);
// ID Proofs routes for a specific tenant
router.post('/tenants/:tenantId/photo', authMiddleware, roleMiddleware('admin', 'agent'), upload.single('photo'), tenantController.uploadTenantphotos);
router.delete('/tenants/:tenantId/photo/:photoId', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.deleteTenantphotos);


// -------------------- Flats Routes --------------------
router.post('/properties/:propertyId/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.createFlat);
router.get('/properties/:propertyId/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlatsByProperty);
router.get('/flats/available', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getAllAvailableFlats);

router.get('/flats/:flatId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlatById);
router.patch('/flats/:flatId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.updateFlat);
router.delete('/flats/:flatId', authMiddleware, roleMiddleware('admin'), flatController.deleteFlat);
// Upload a photo for a flat
router.post('/flats/:flatId/photos', authMiddleware, roleMiddleware('admin', 'agent'), upload.single('photo'), flatController.uploadFlatPhoto);
router.delete('/flats/:flatId/photos/:photoId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.deleteFlatPhoto);

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
