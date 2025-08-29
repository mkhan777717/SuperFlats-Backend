// config/database.js

const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT || 5432,
  },
  production: {
    // In a production environment, you would typically use a connection URI
    // provided by your hosting provider (e.g., Heroku, AWS, Railway)
    // For example:
    // use_env_variable: 'DATABASE_URL',
    // dialect: 'postgres'
    username: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASS,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.PROD_DB_PORT,
  },
};