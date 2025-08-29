// models/GroupedListing.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupedListing = sequelize.define('GroupedListing', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'grouped_listings',
    timestamps: false,
  });

  GroupedListing.associate = (models) => {
    // A GroupedListing can have many Listings through the GroupedListingItem join table.
    GroupedListing.belongsToMany(models.Listing, {
      through: models.GroupedListingItem,
      foreignKey: 'group_id',
      otherKey: 'listing_id',
      as: 'listings',
    });
  };

  return GroupedListing;
};