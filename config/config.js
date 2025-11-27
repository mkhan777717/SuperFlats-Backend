const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: process.env.DB_PORT || 3306, 
    
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
    
    dialectOptions: {
      ssl: {
        require: true, 

        rejectUnauthorized: false, 
      },
    },
    

    pool: {
      max: 5,   
      min: 0,
      acquire: 20000,
      idle: 10000
    }
  },
};
