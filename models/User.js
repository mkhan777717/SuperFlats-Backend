const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        phone_number: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIn: [['admin', 'agent', 'client']],
            },
        },
        profile_image: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // Add the company_id field here
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        User.hasMany(models.Property, {
            foreignKey: 'owner_id',
            as: 'properties',
        });
        User.hasMany(models.Lease, {
            foreignKey: 'client_id',
            as: 'leases',
        });
        User.hasMany(models.Payment, {
            foreignKey: 'payer_id',
            as: 'payments',
        });
        User.hasMany(models.Appointment, {
            foreignKey: 'user_id',
            as: 'appointments',
        });

        // The association with the Employee model is correct
        User.hasOne(models.Employee, {
            foreignKey: 'user_id',
            as: 'employee',
        });

        // Add the new association to the Company model
        User.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company',
        });
    };

    return User;
};
