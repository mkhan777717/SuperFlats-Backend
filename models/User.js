const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'companies',
                key: 'id',
            },
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
        fcm_token: {
            type: DataTypes.STRING(255), 
            allowNull: true,             
        },

    }, {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    User.associate = (models) => {
        User.hasMany(models.Listing, {
            foreignKey: 'lister_id',
            as: 'listings',
            onDelete: 'CASCADE',
        });
        User.hasMany(models.Appointment, {
            foreignKey: 'user_id',
            as: 'appointments',
            onDelete: 'CASCADE',
        });

        User.hasOne(models.Employee, {
            foreignKey: 'user_id',
            as: 'employee',
            onDelete: 'CASCADE',
        });
        User.hasMany(models.FavoritesListing, {
            foreignKey: 'user_id',
            as: 'favorites',
            onDelete: 'CASCADE',
        });

    };

    return User;
};
