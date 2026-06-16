'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'usuario', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'name'
    });

    await queryInterface.addColumn('users', 'usu_id_pizza', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'usuario'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'usu_id_pizza');
    await queryInterface.removeColumn('users', 'usuario');
  }
};
