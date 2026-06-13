'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('companies');

    // Safe guards: Only execute if the target column does not exist yet
    if (!tableDefinition.plan_type) {
      await queryInterface.addColumn('companies', 'plan_type', {
        type: Sequelize.ENUM('free', 'pro', 'org'),
        allowNull: false,
        defaultValue: 'free'
      });
    }

    if (!tableDefinition.subscription_status) {
      await queryInterface.addColumn('companies', 'subscription_status', {
        type: Sequelize.ENUM('active', 'cancelled', 'none'),
        allowNull: false,
        defaultValue: 'none'
      });
    }

    if (!tableDefinition.subscription_expires_at) {
      await queryInterface.addColumn('companies', 'subscription_expires_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableDefinition.google_original_order_id) {
      await queryInterface.addColumn('companies', 'google_original_order_id', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableDefinition.is_verified) {
      await queryInterface.addColumn('companies', 'is_verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!tableDefinition.owner_id) {
      await queryInterface.addColumn('companies', 'owner_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('companies', 'plan_type');
    await queryInterface.removeColumn('companies', 'subscription_status');
    await queryInterface.removeColumn('companies', 'subscription_expires_at');
    await queryInterface.removeColumn('companies', 'google_original_order_id');
    await queryInterface.removeColumn('companies', 'is_verified');
    await queryInterface.removeColumn('companies', 'owner_id');
  }
};