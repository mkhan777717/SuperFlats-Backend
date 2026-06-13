'use strict';

const { sequelize } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('companies', 'plan_type', {
      type: Sequelize.ENUM('free', 'pro', 'org'),
      allowNull: false,
      defaultValue: 'free'
    })
    await queryInterface.addColumn('companies', 'subscription_status', {
      type: Sequelize.ENUM('active', 'cancelled', 'none'),
      allowNull: false,
      defaultValue: 'none'
    })
    await queryInterface.addColumn('companies', 'subscription_expires_at', {
      type: Sequelize.DATE,
      allowNull: true
    })
    await queryInterface.addColumn('companies', 'google_original_order_id', {
      type: Sequelize.STRING,
      allowNull: true
    })
    await queryInterface.addColumn('companies', 'is_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    await queryInterface.addColumn('companies', 'owner_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('companies', 'plan_type')
    await queryInterface.removeColumn('companies', 'subscription_status')
    await queryInterface.removeColumn('companies', 'subscription_expires_at')
    await queryInterface.removeColumn('companies', 'google_original_order_id')
    await queryInterface.removeColumn('companies', 'is_verified')
    await queryInterface.removeColumn('companies', 'owner_id')
  }
};
