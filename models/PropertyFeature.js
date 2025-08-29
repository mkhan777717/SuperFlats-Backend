// models/PropertyFeature.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PropertyFeature = sequelize.define('PropertyFeature', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    property_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bedrooms: {
      type: DataTypes.INTEGER,
    },
    bathrooms: {
      type: DataTypes.INTEGER,
    },
    area_sqft: {
      type: DataTypes.DECIMAL(10, 2),
    },
    furnishing: {
      type: DataTypes.STRING,
      validate: {
        isIn: [['furnished', 'semi-furnished', 'unfurnished']],
      },
    },
    parking: {
      type: DataTypes.BOOLEAN,
    },
    amenities: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'property_features',
    timestamps: false,
  });

  PropertyFeature.associate = (models) => {
    // PropertyFeatures belongs to a single property.
    PropertyFeature.belongsTo(models.Property, {
      foreignKey: 'property_id',
      as: 'property',
    });
  };

  return PropertyFeature;
};