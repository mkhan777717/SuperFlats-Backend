// models/Lease.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Lease = sequelize.define('Lease', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        listing_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        rent_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        deposit_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'terminated', 'completed']],
            },
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'leases',
        timestamps: false,
    });

    Lease.associate = (models) => {
        // A lease belongs to a single listing.
        Lease.belongsTo(models.Listing, {
            foreignKey: 'listing_id',
            as: 'listing',
        });

        // A lease belongs to a single user (the tenant).
        Lease.belongsTo(models.User, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });

        // A lease can have many payments.
        Lease.hasMany(models.Payment, {
            foreignKey: 'lease_id',
            as: 'payments',
        });
    };

    return Lease;
};