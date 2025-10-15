const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Tenant = sequelize.define('Tenant', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        phone_number: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('available', 'occupied'),
            allowNull: false,
            defaultValue: 'available',
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
        Tenant.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company',
            onDelete: 'CASCADE',
        });
        Tenant.hasMany(models.Booking, {
            foreignKey: 'tenant_id',
            as: 'bookings',
        });
        Tenant.hasMany(models.Photo, {
            foreignKey: 'imageable_id',
            constraints: false,
            scope: {
                imageable_type: 'Tenant'
            },
            as: 'photos',
            onDelete: 'CASCADE',
        });
        Tenant.hasOne(models.Ledger, {
            foreignKey: 'tenant_id',
            as: 'ledger'
        });
    };

    return Tenant;
};