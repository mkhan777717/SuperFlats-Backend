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
        // When a User is deleted, their Listings are deleted.
        User.hasMany(models.Listing, {
            foreignKey: 'lister_id',
            as: 'listings',
            onDelete: 'CASCADE',
        });
        User.hasMany(models.Payment, {
            foreignKey: 'payer_id',
            as: 'payments',
            onDelete: 'CASCADE',
        });
        User.hasMany(models.Appointment, {
            foreignKey: 'user_id',
            as: 'appointments',
            onDelete: 'CASCADE',
        });

        // When a User is deleted, their Employee record is deleted.
        User.hasOne(models.Employee, {
            foreignKey: 'user_id',
            as: 'employee',
            onDelete: 'CASCADE',
        });

        // Add the new association to the Company model
        User.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company',
        });
    };

    return User;
};
