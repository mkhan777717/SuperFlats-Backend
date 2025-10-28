const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Flat = sequelize.define('Flat', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
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
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
        },
        unit_number: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIn: [['1RK', '1BHK', '2BHK', '3BHK', '3BHK+']],
            },
        },
        area_sqft: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        flatStatus: {
            type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
            defaultValue: 'available',
        },
        unique_amenities: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },

    }, {
        tableName: 'flats',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{
            unique: true,
            fields: ['property_id', 'unit_number']
        }]
    });

    Flat.associate = (models) => {
        Flat.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
        Flat.belongsTo(models.Property, { foreignKey: 'property_id', as: 'property' });
        Flat.hasMany(models.Photo, {
            foreignKey: 'imageable_id',
            constraints: false,
            scope: {
                imageable_type: 'Flat'
            },
            as: 'photos',
            onDelete: 'CASCADE',
        });
        Flat.hasOne(models.Booking, {
            foreignKey: 'flat_id',
            as: 'booking',
            onDelete: 'CASCADE',
        });
        Flat.hasMany(models.Listing, {
            foreignKey: 'flat_id',
            as: 'listings',
            onDelete: 'CASCADE',
        });
    };

    return Flat;
};