'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'usu_id_pizza');
  },

  async down(queryInterface, Sequelize) {
    // Recreate the column as nullable (no data is restored, this is a fallback only)
    await queryInterface.addColumn('users', 'usu_id_pizza', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      after: 'usuario'
    });
  }
};
