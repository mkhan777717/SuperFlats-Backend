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
    plan_type: {
      type: DataTypes.ENUM('free', 'pro', 'org'),
      allowNull: false,
      defaultValue: 'free',
    },
    subscription_status: {
      type: DataTypes.ENUM('active', 'cancelled', 'none'),
      allowNull: false,
      defaultValue: 'none',
    },
    subscription_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    google_original_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  // Fixed: All associations grouped properly inside a single associate function
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
    Company.belongsTo(models.User, {
      foreignKey: 'owner_id',
      as: 'owner',
      onDelete: 'CASCADE',
    });
  };

  return Company;
};