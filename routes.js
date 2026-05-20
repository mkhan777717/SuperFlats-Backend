const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controllers
const authController = require('./controllers/auth.controller');
const propertyController = require('./controllers/property.controller');
const appointmentController = require('./controllers/appointment.controller');
const employeeController = require('./controllers/employee.controller');
const listingController = require('./controllers/listing.controller');
const userController = require('./controllers/user.controller');
const bookingController = require('./controllers/booking.controller');
const tenantController = require('./controllers/tenant.controller');
const flatController = require('./controllers/flat.controller');
const rentController = require('./controllers/rent.controller');
const favoritesController = require('./controllers/favorites.controller');
const placesProxy = require('./controllers/places-proxy.controller');
const dashboardController = require('./controllers/dashboard.controller');


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
router.post('/auth/refresh', authController.tokenRefresh);

// -------------------- User Routes --------------------
// Routes for managing the currently authenticated user's profile
router.get('/user/me', authMiddleware, userController.getProfile);
router.post('/user/upload-profile-image', authMiddleware, upload.single('profile_image'), userController.uploadProfileImage);
router.put('/user/me', authMiddleware, userController.updateProfile);
router.delete('/user/remove-profile-image', authMiddleware, userController.removeProfileImage);
router.put('/user/update-password', authMiddleware, userController.updatePassword);
router.post('/user/register-token', authMiddleware, userController.registerFcmToken);

// -------------------- Property Routes --------------------
router.post('/properties', authMiddleware, roleMiddleware('admin', 'agent'), propertyController.createProperty);
router.get('/properties/', authMiddleware, roleMiddleware('admin', 'agent'), propertyController.getProperties);
router.get('/properties/:id', propertyController.getPropertyById);
router.patch('/properties/:id', authMiddleware, roleMiddleware('admin'), propertyController.updateProperty);
router.delete('/properties/:id', authMiddleware, roleMiddleware('admin'), propertyController.deleteProperty);
router.post('/properties/upload-photo/:id', authMiddleware, upload.single('photo'), propertyController.uploadPhoto);
router.delete('/properties/:propertyId/photos/:photoId', authMiddleware, roleMiddleware('admin', 'agent'), propertyController.deletePhoto);
router.get('/properties/:id/overview', propertyController.getPropertyOverview);
// -------------------- Listing Routes --------------------
router.get('/listings/public/search', listingController.publicSearchListings);
router.post('/listings', authMiddleware, roleMiddleware('agent', 'admin'), listingController.createListing);
router.get('/listings/me', authMiddleware, roleMiddleware('agent', 'admin'), listingController.getMyListings);
router.get('/listings/:id', listingController.getListingById);
router.patch('/listings/:id', authMiddleware, roleMiddleware('admin'), listingController.updateListing);
router.delete('/listings/:id', authMiddleware, roleMiddleware('admin'), listingController.deleteListing);
router.get('/properties/:propertyId/listings', authMiddleware, roleMiddleware('admin', 'agent'), listingController.getListingsByProperty);
router.get('/listings/summary/properties', authMiddleware, roleMiddleware('admin', 'agent'), listingController.getPropertiesSummary);

// -------------------- Appointment Routes --------------------
router.post('/appointments', authMiddleware, roleMiddleware('client'), appointmentController.createAppointment);
router.patch('/appointments/:id', authMiddleware, roleMiddleware('admin', 'agent', 'client'), appointmentController.updateAppointment);
router.get('/appointments/me', authMiddleware, appointmentController.getAppointments);
router.get('/appointments/:id', authMiddleware, appointmentController.getAppointmentById);
router.delete('/appointments/:id', authMiddleware, roleMiddleware('admin', 'agent'), appointmentController.deleteAppointment);
router.patch('/appointments/:id/feedback', authMiddleware, appointmentController.updateAppointmentFeedback);

// -------------------- Employee Routes --------------------
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
router.get('/properties/:propertyId/bookings', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.getBookingsByProperty);
router.get('/bookings/summary/properties', authMiddleware, roleMiddleware('admin', 'agent'), bookingController.getPropertiesSummary);

// -------------------- Tenant Routes --------------------
router.get('/properties/:propertyId/tenants/available', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getAvailableTenants);
router.post('/tenants', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.createTenant);
router.get('/tenants', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getAllTenants);
router.get('/tenants/:id', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getTenantById);
router.patch('/tenants/:id', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.updateTenant);
router.delete('/tenants/:id', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.deleteTenant);
router.post('/tenants/:tenantId/photo', authMiddleware, roleMiddleware('admin', 'agent'), upload.single('photo'), tenantController.uploadTenantphotos);
router.delete('/tenants/:tenantId/photo/:photoId', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.deleteTenantphotos);
router.get('/properties/:propertyId/tenants', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getTenantsByProperty);
router.get('/tenants/summary/properties', authMiddleware, roleMiddleware('admin', 'agent'), tenantController.getPropertiesSummary);

// -------------------- Flats Routes --------------------
router.post('/properties/:propertyId/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.createFlat);
router.get('/properties/:propertyId/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlatsByProperty);
router.get('/flats', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlats);
router.get('/properties/:propertyId/listings/flats/available', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getAvailableFlatsForListing);
router.get('/properties/:propertyId/bookings/flats/available', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getAvailableFlatsForBooking);
router.get('/flats/:flatId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getFlatById);
router.patch('/flats/:flatId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.updateFlat);
router.delete('/flats/:flatId', authMiddleware, roleMiddleware('admin'), flatController.deleteFlat);
router.post('/flats/:flatId/photos', authMiddleware, roleMiddleware('admin', 'agent'), upload.single('photo'), flatController.uploadFlatPhoto);
router.delete('/flats/:flatId/photos/:photoId', authMiddleware, roleMiddleware('admin', 'agent'), flatController.deleteFlatPhoto);
router.get('/flats/summary/properties', authMiddleware, roleMiddleware('admin', 'agent'), flatController.getPropertiesSummary);

// -------------------- Rent Routes (Admin-Only) --------------------
router.get('/rents/bills', authMiddleware, roleMiddleware('admin', 'agent'), rentController.getAllRentBills);
router.get('/rents/tenants/:tenantId/history', authMiddleware, roleMiddleware('admin', 'agent'), rentController.getRentHistoryForTenant);
router.get('/rents/tenants/:tenantId/total-due', authMiddleware, roleMiddleware('admin', 'agent'), rentController.getTotalDueForTenant);
router.patch('/rents/bills/:billId/pay', authMiddleware, roleMiddleware('admin', 'agent'), rentController.markBillAsPaid);
router.patch('/rents/bills/:billId/unpay', authMiddleware, roleMiddleware('admin', 'agent'), rentController.markBillAsUnpaid);
router.get('/properties/:propertyId/tenants-with-due', authMiddleware, roleMiddleware('admin', 'agent'), rentController.getTenantsWithDueByProperty);
router.get('/rents/summary/properties', authMiddleware, roleMiddleware('admin', 'agent'), rentController.getPropertiesSummary);

// -------------------- Favorites Routes --------------------
router.post('/favorites/toggle/:listingId', authMiddleware, favoritesController.toggleFavorite);
router.get('/favorites', authMiddleware, favoritesController.getFavorites);

// -------------------- Google Maps --------------------
router.post('/places/details', placesProxy.getPlaceDetails);
router.get('/places/search/suggestions', placesProxy.getPlaceSuggestions);
router.get('/places/map/image', placesProxy.mapToImageUrl);

// -------------------- Dashboard Routes --------------------
router.get('/dashboard/stats', authMiddleware, roleMiddleware('admin', 'agent'), dashboardController.getDashboardStats);
router.get('/dashboard/business-kpis', authMiddleware, dashboardController.getBusinessKpiStats);
module.exports = router;
