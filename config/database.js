const dotenv = require('dotenv');
dotenv.config();

// Helper to determine if a connection is local (where SSL is typically disabled)
const isLocalConnection = (host) => host === 'localhost' || host === '127.0.0.1';

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT || 3306, // Default to MySQL port
    
dialectOptions: {
  ssl: false,
},

  },
  
  production: {
    username: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASS,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.PROD_DB_PORT,
    
    // 🎯 FIX 1: Mandate SSL connection for the remote Hostinger database
    dialectOptions: {
      ssl: {
        require: true, 
        // We set rejectUnauthorized to false to avoid requiring a specific CA certificate file,
        // which simplifies deployment setup.
        rejectUnauthorized: false, 
      },
    },
    
    // 🎯 FIX 2: Restrict the connection pool size to respect shared hosting limits
    // Shared hosting environments (like Hostinger's standard plans) often have low connection limits (e.g., 10-15). 
    // We set this low to prevent connection queueing/blocking when under heavy load.
    pool: {
      max: 5,   // Maximum number of connections in the pool
      min: 0,   // Minimum number of connections in the pool
      acquire: 20000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
      idle: 10000     // The maximum time, in milliseconds, that a connection can be idle before being released
    }
  },
};
