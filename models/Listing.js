const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Listing = sequelize.define('Listing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    flat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'flats',
        key: 'id',
      },
    },
    lister_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
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
    monthly_rent: {
      type: DataTypes.DECIMAL(12, 2),
    },
    security_amount: {
      type: DataTypes.DECIMAL(12, 2),
    },
    security_type: {
      type: DataTypes.ENUM('lease', 'deposit'),
      allowNull: false,
      defaultValue: 'deposit',
    },
    status: {
      type: DataTypes.ENUM('active', 'closed', 'pending'),
      allowNull: false,
      defaultValue: 'pending',
    },
  }, {
    tableName: 'listings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Listing.associate = (models) => {
    // A listing belongs to a flat.
    Listing.belongsTo(models.Flat, {
      foreignKey: 'flat_id',
      as: 'flat',
      onDelete: 'CASCADE',
    });

    // A listing has a lister (the user who created it).
    Listing.belongsTo(models.User, {
      foreignKey: 'lister_id',
      as: 'lister',
      onDelete: 'CASCADE',
    });

    // A listing belongs to a company.
    Listing.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onDelete: 'CASCADE',
    });

    // When a Listing is deleted, its Appointments are deleted.
    Listing.hasMany(models.Appointment, {
      foreignKey: 'listing_id',
      as: 'appointments',
      onDelete: 'CASCADE',
    });

    // When a Listing is deleted, users' favorites of it are deleted.
    Listing.hasMany(models.FavoritesListing, {
      foreignKey: 'listing_id',
      as: 'favorites',
      onDelete: 'CASCADE',
    });
  };

  return Listing;
};
