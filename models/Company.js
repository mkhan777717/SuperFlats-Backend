const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'companies',
    timestamps: false,
  });

  Company.associate = (models) => {
    // A company can have many users (employees or admins)
    Company.hasMany(models.User, {
      foreignKey: 'company_id',
      as: 'users',
    });
    // A company can have many employees
    Company.hasMany(models.Employee, {
      foreignKey: 'company_id',
      as: 'employees',
    });
  };

  return Company;
};
