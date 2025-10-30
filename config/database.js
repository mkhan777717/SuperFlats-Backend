// config/database.js

const dotenv = require('dotenv');
dotenv.config();

// Helper to determine if a connection is local (where SSL is typically disabled)
const isLocalConnection = (host) => host === 'localhost' || host === '127.0.0.1';

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT || 3306, // Default to MySQL port
    
    // 🎯 FIX: Explicitly disable SSL for localhost to bypass the error
    dialectOptions: {
      ssl: isLocalConnection(process.env.DB_HOST) ? false : { 
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  
  production: {
    username: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASS,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.PROD_DB_PORT,
    
    // 🎯 FIX: Mandatory SSL settings for Azure MySQL
    dialectOptions: {
      // Azure/Cloud DBs require secure transport
      ssl: 
      
      { 
        require: true,
        rejectUnauthorized: false, // This allows the connection without providing the Azure CA certificate file
      },
    },
  },
};