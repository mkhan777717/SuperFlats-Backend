const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lease = sequelize.define('Lease', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    property_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'properties',
        key: 'id',
      },
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    listing_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'listings',
        key: 'id',
      },
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    monthly_rent: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    deposit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'security_deposit', // Optional: use a more explicit column name if desired, or stick to 'deposit'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['active', 'in_active']],
      },
      defaultValue: 'active',
    },
  }, {
    tableName: 'leases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at', // Corrected to use a standard field name
  });

  Lease.associate = (models) => {
    // A Lease belongs to one Property
    Lease.belongsTo(models.Property, {
      foreignKey: 'property_id',
      as: 'property'
    });

    // A Lease belongs to one Tenant
    Lease.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    Lease.belongsTo(models.Listing, {
      foreignKey: 'listing_id',
      as: 'listing'
    });


  };

  return Lease;
};
