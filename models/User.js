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
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIn: [['tenant', 'owner', 'employee']],
            },
        },
        profile_image: {
            type: DataTypes.STRING,
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

        User.hasMany(models.Listing, {
            foreignKey: 'lister_id',
            as: 'listings',
        });

        User.hasMany(models.Appointment, {
            foreignKey: 'user_id',
            as: 'appointments',
        });

        User.hasMany(models.Lease, {
            foreignKey: 'tenant_id',
            as: 'leases',
        });

        User.hasMany(models.Payment, {
            foreignKey: 'payer_id',
            as: 'payments',
        });

        User.hasOne(models.Employee, {
            foreignKey: 'user_id',
            as: 'employee',
        });
    };

    return User;
};
