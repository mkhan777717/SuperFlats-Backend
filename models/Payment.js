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
    },
    payer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
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
        isIn: [['pending', 'completed', 'failed']],
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

    // A payment is made by a user (the payer).
    Payment.belongsTo(models.User, {
      foreignKey: 'payer_id',
      as: 'payer',
    });
  };

  return Payment;
};
