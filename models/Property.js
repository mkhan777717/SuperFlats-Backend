// models/Property.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Property = sequelize.define('Property', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    property_type: {
      type: DataTypes.STRING,
      validate: {
        isIn: [['apartment', 'villa', 'office', 'land']],
      },
    },
    address: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    country: {
      type: DataTypes.STRING,
    },
    zipcode: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'properties',
    timestamps: false,
  });

  Property.associate = (models) => {
    // A property belongs to a user (the owner).
    Property.belongsTo(models.User, {
      foreignKey: 'owner_id',
      as: 'owner',
    });

    // A property can have many listings.
    Property.hasMany(models.Listing, {
      foreignKey: 'property_id',
      as: 'listings',
    });
    
    // A property has one set of features.
    Property.hasOne(models.PropertyFeature, {
      foreignKey: 'property_id',
      as: 'features',
    });

    // A property can have many photos.
    Property.hasMany(models.PropertyPhoto, {
      foreignKey: 'property_id',
      as: 'photos',
    });
  };

  return Property;
};