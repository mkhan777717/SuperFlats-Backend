const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Property = sequelize.define('Property', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
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
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zipcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      defaultValue: null,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      defaultValue: null,
    },
  }, {
    tableName: 'properties',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  Property.associate = (models) => {
    Property.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' });
    Property.hasOne(models.PropertyFeature, { foreignKey: 'property_id', as: 'features', onDelete: 'CASCADE' });
    Property.hasMany(models.PropertyPhoto, { foreignKey: 'property_id', as: 'photos', onDelete: 'CASCADE' });
    Property.hasOne(models.Listing, { foreignKey: 'property_id', as: 'listings' });
  };

  return Property;
};
