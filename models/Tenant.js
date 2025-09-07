const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Tenant = sequelize.define('Tenant', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        contact_info: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        joinDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'tenants',
        timestamps: false,
    });

    Tenant.associate = (models) => {
        Tenant.hasMany(models.Lease, {
            foreignKey: 'tenant_id',
            as: 'leases',
        });
        Tenant.hasOne(models.Ledger, {
            foreignKey: 'tenant_id',
            as: 'ledger'
        });
    };

    return Tenant;
};