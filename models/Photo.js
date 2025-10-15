const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Photo = sequelize.define('Photo', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        imageable_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        imageable_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        photo_url: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        name: { 
            type: DataTypes.STRING,
            allowNull: true, // Allow null for other photo types like property/flat images
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'photos',
        timestamps: false,
        indexes: [
            {
                name: 'idx_imageable',
                fields: ['imageable_id', 'imageable_type'],
            },
        ],
    });

    return Photo;
};