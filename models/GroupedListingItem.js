// models/GroupedListingItem.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupedListingItem = sequelize.define('GroupedListingItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    listing_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'grouped_listing_items',
    timestamps: false,
  });

  return GroupedListingItem;
};