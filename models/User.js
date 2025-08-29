// models/User.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['tenant', 'owner', 'agent', 'admin']],
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'users',
    timestamps: false,
  });

  User.associate = (models) => {
    // A user can own many properties.
    User.hasMany(models.Property, {
      foreignKey: 'owner_id',
      as: 'properties',
    });

    // A user can be a lister for many listings.
    User.hasMany(models.Listing, {
      foreignKey: 'lister_id',
      as: 'listings',
    });

    // A user can have many appointments.
    User.hasMany(models.Appointment, {
      foreignKey: 'user_id',
      as: 'appointments',
    });

    // A user can be a tenant for many leases.
    User.hasMany(models.Lease, {
      foreignKey: 'tenant_id',
      as: 'leases',
    });

    // A user can make many payments.
    User.hasMany(models.Payment, {
      foreignKey: 'payer_id',
      as: 'payments',
    });

    // A user can be an employee. This is a one-to-one relationship.
    User.hasOne(models.Employee, {
      foreignKey: 'user_id',
      as: 'employee',
    });
  };

  return User;
};