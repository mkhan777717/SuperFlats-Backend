const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lease_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'leases',
        key: 'id',
      },
    },
    payer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tenants', // Payer is now a Tenant, not a User
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    method: {
      type: DataTypes.STRING,
      validate: {
        isIn: [['bank', 'cash']],
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'paid']],
      },
    },
  }, {
    tableName: 'payments',
    timestamps: false,
  });

  Payment.associate = (models) => {
    // A payment belongs to a lease.
    Payment.belongsTo(models.Lease, {
      foreignKey: 'lease_id',
      as: 'lease',
    });

    // A payment is made by a tenant (the payer).
    Payment.belongsTo(models.Tenant, {
      foreignKey: 'payer_id',
      as: 'payer',
    });
  };

  return Payment;
};