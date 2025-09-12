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
