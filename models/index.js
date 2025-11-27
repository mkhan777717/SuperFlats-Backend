// models/index.js

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

const db = {};

// Use the correct environment configuration
const env = process.env.NODE_ENV || 'development';
const currentConfig = config[env];

// Create a new Sequelize instance
const sequelize = new Sequelize(
    currentConfig.database,
    currentConfig.username,
    currentConfig.password,
    {
        host: currentConfig.host,
        dialect: currentConfig.dialect,
        logging: false,
        port: currentConfig.port, // <--- Add port
        dialectOptions: currentConfig.dialectOptions, // <--- ADD THIS LINE
    }
);

// Read all model files from the current directory, except for this file
fs.readdirSync(__dirname)
    .filter(file => {
        return (
            file.indexOf('.') !== 0 &&
            file !== 'index.js' &&
            file.slice(-3) === '.js'
        );
    })
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, DataTypes);
        db[model.name] = model;
    });

// Set up associations for all models
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;