'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'fcm_token', {
      type: Sequelize.DataTypes.STRING(255),
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
   await queryInterface.removeColumn('users', 'fcm_token');
  }
};
