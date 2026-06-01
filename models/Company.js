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
    owner_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Company.associate = (models) => {
    Company.hasMany(models.User, {
      foreignKey: 'company_id',
      as: 'users',
      onDelete: 'CASCADE',
    });
    Company.hasMany(models.Listing, {
      foreignKey: 'company_id',
      as: 'listings',
      onDelete: 'CASCADE',
    });
    Company.hasMany(models.Property, {
      foreignKey: 'company_id',
      as: 'properties',
      onDelete: 'CASCADE',
    });
    Company.hasMany(models.Employee, {
      foreignKey: 'company_id',
      as: 'employees',
      onDelete: 'CASCADE',
    });
    Company.associate = (models) => {
      Company.belongsTo(models.User, {
        foreignKey: 'owner_id',
        as: 'owner',
        onDelete: 'CASCADE',
      });
    }
  };

  return Company;
};
