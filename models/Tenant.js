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
        property_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'properties',
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

    }, {
        tableName: 'tenants',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    Tenant.associate = (models) => {
        Tenant.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company',
            onDelete: 'CASCADE',
        });
        Tenant.belongsTo(models.Property, {
            foreignKey: 'property_id',
            as: 'property',
            onDelete: 'CASCADE',
        });
        Tenant.hasMany(models.Booking, {
            foreignKey: 'tenant_id',
            as: 'bookings',
            onDelete: 'CASCADE',
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

        Tenant.hasMany(models.RentBill, {
            foreignKey: 'tenant_id',
            as: 'rent_bills',
        });
    };

    return Tenant;
};