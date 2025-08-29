// models/Appointment.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    listing_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'confirmed', 'cancelled', 'completed']],
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'appointments',
    timestamps: false, // We're using a specific created_at column
  });

  Appointment.associate = (models) => {
    // An appointment belongs to a user (the one who booked it)
    Appointment.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    // An appointment belongs to a specific listing
    Appointment.belongsTo(models.Listing, {
      foreignKey: 'listing_id',
      as: 'listing',
    });
  };

  return Appointment;
};