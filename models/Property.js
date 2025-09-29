const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Property = sequelize.define('Property', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies', // Assuming your company table is named 'companies'
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

    is_managed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  }, {
    tableName: 'properties',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  Property.associate = (models) => {
    // This association is now correct, linking Property to Company via company_id
    Property.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });

    // The original associations are still here
    // When a Property is deleted, its Features are deleted.
    Property.hasOne(models.PropertyFeature, {
      foreignKey: 'property_id',
      as: 'features',
      onDelete: 'CASCADE',
    });
    // When a Property is deleted, its Photos are deleted.
    Property.hasMany(models.PropertyPhoto, {
      foreignKey: 'property_id',
      as: 'photos',
      onDelete: 'CASCADE',
    });
    // When a Property is deleted, its Listing is deleted.
    Property.hasOne(models.Listing, {
      foreignKey: 'property_id',
      as: 'listings',
      onDelete: 'CASCADE',
    });
  };

  return Property;
};
