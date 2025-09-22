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
    // When a Company is deleted, its Users are deleted.
    Company.hasMany(models.User, {
      foreignKey: 'company_id',
      as: 'users',
      onDelete: 'CASCADE',
    });
    // When a Company is deleted, its Listings are deleted.
    Company.hasMany(models.Listing, {
      foreignKey: 'company_id',
      as: 'listings',
      onDelete: 'CASCADE',
    });
    // When a Company is deleted, its Properties are deleted.
    Company.hasMany(models.Property, {
      foreignKey: 'company_id',
      as: 'properties',
      onDelete: 'CASCADE',
    });
    // A company can have many employees
    Company.hasMany(models.Employee, {
      foreignKey: 'company_id',
      as: 'employees',
    });
  };

  return Company;
};
