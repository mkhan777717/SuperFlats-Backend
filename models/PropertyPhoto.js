// models/PropertyPhoto.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PropertyPhoto = sequelize.define('PropertyPhoto', {
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
        tableName: 'property_photos',
        timestamps: false,
    });

    PropertyPhoto.associate = (models) => {
        // A property photo belongs to a single property.
        PropertyPhoto.belongsTo(models.Property, {
            foreignKey: 'property_id',
            as: 'property',
        });
    };

    return PropertyPhoto;
};