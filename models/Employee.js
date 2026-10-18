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
    // Add the company_id field to link an employee to their company.
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
  }, {
    tableName: 'employees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Employee.associate = (models) => {
    // An employee record belongs to a user record.
    Employee.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });

    // Add a new association: an employee belongs to a company.
    Employee.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onDelete: 'CASCADE',
    });
  };

  return Employee;
};
