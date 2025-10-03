// app.js

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan'); // For request logging
const cors = require('cors'); // To allow cross-origin requests
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const app = express();
const db = require('./models');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const rentScheduler = require('./tasks/rentScheduler');


// Middleware
app.use(express.json()); // Allows the app to parse JSON from the request body
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cors()); // Enable CORS for all routes
app.use(morgan('dev')); // Log HTTP requests in the console

// Sync database and models
db.sequelize.sync({ force: false }) // `force: true` will drop existing tables and re-create them. Use with caution.
  .then(() => {
    logger.info('Database & tables synced successfully!');
  })
  .catch(err => {
    logger.error('Failed to sync database:', err);
  });

// Routes
app.use('/api', routes); // Mount your API routes under the /api path

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Real Estate Management System API!');
});

// Error handling middleware (must be the last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  rentScheduler.startRentScheduler();
});