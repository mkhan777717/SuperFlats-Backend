
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Listing = sequelize.define('Listing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    property_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lister_id: {
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
    price: {
      type: DataTypes.DECIMAL(12, 2),
    },
    lease_expected_amount: {
      type: DataTypes.DECIMAL(12, 2),
    },
    deposit_expected_amount: {
      type: DataTypes.DECIMAL(12, 2),
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['active', 'closed', 'pending']],
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'listings',
    timestamps: false,
  });

  Listing.associate = (models) => {
    // A listing belongs to a property.
    Listing.belongsTo(models.Property, {
      foreignKey: 'property_id',
      as: 'property',
    });

    // A listing has a lister (the user who created it).
    Listing.belongsTo(models.User, {
      foreignKey: 'lister_id',
      as: 'lister',
    });
    
    // A listing can have many appointments.
    Listing.hasMany(models.Appointment, {
      foreignKey: 'listing_id',
      as: 'appointments',
    });

    // A listing can have one lease.
    Listing.hasOne(models.Lease, {
      foreignKey: 'listing_id',
      as: 'lease',
    });

    // A listing can belong to many grouped listings.
    Listing.belongsToMany(models.GroupedListing, {
      through: models.GroupedListingItem,
      foreignKey: 'listing_id',
      otherKey: 'group_id',
      as: 'groups',
    });
  };

  return Listing;
};