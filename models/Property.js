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
        model: 'companies',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
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
    // Count of 1RK units
    count_1rk: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Count of 1BHK units
    count_1bhk: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Count of 2BHK units
    count_2bhk: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Count of 3BHK units
    count_3bhk: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // Count of 3BHK+ units (e.g., 4BHK, 5BHK, etc.)
    count_3bhk_plus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    area_sqft: {
      type: DataTypes.DECIMAL(10, 2),
    },

    parking: {
      type: DataTypes.BOOLEAN,
    },
    amenities: {
      type: DataTypes.JSON,
      get() {
        // Parse the JSON string from the database back into a JavaScript array
        const rawValue = this.getDataValue('amenities');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(val) {
        // Stringify the array before saving it to the database
        this.setDataValue('amenities', JSON.stringify(val));
      }
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

    // When a Property is deleted, its Photos are deleted.
    Property.hasMany(models.Photo, {
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
