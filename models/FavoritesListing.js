const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FavoritesListing = sequelize.define('FavoritesListing', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        listing_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'listings',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
    }, {
        tableName: 'favorites_listings',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    FavoritesListing.associate = (models) => {
        FavoritesListing.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
            onDelete: 'CASCADE',
        });
        FavoritesListing.belongsTo(models.Listing, {
            foreignKey: 'listing_id',
            as: 'listing',
            onDelete: 'CASCADE',
        });
    };

    return FavoritesListing;
};