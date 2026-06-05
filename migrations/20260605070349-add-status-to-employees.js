'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('employees', 'status', {
      type: Sequelize.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'inactive',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('employees', 'status');
  }
};
