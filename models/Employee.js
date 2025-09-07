// models/Employee.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Employee = sequelize.define('Employee', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['agent', 'admin']],
      },
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'employees',
    timestamps: false, // We're using a specific joined_at column
  });

  Employee.associate = (models) => {
    // An employee record belongs to a user record.
    Employee.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return Employee;
};