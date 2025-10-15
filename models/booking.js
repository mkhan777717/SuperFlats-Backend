const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
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
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants',
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
    security_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    }, security_type: {
      type: DataTypes.ENUM('lease', 'deposit'),
      allowNull: false,
      defaultValue: 'deposit',
    },
  }, {
    tableName: 'bookings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at', // Corrected to use a standard field name
  });

  Booking.associate = (models) => {
    // A Booking belongs to one Flat
    Booking.belongsTo(models.Flat, {
      foreignKey: 'flat_id',
      as: 'flat'
    });

    // A Booking belongs to one Tenant
    Booking.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });
  };

  return Booking;
};
