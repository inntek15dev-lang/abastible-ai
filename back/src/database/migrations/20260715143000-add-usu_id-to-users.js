'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'usu_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'usu_id_pizza'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'usu_id');
  }
};
