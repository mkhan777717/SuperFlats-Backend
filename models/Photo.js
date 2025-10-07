// models/Photo.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Photo = sequelize.define('Photo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        property_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        photo_url: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'photos',
        timestamps: false,
    });

    Photo.associate = (models) => {
        // A property photo belongs to a single property.
        Photo.belongsTo(models.Property, {
            foreignKey: 'property_id',
            as: 'property',
        });
    };

    return Photo;
};