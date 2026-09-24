'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('compromisos');
    
    if (!tableInfo.responsabilidad) {
      await queryInterface.addColumn('compromisos', 'responsabilidad', {
        type: Sequelize.ENUM('abastible', 'contratista'),
        allowNull: false,
        defaultValue: 'contratista'
      });
    }

    if (!tableInfo.responsable_cierre_id) {
      await queryInterface.addColumn('compromisos', 'responsable_cierre_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('compromisos');

    if (tableInfo.responsabilidad) {
      await queryInterface.removeColumn('compromisos', 'responsabilidad');
    }
    if (tableInfo.responsable_cierre_id) {
      await queryInterface.removeColumn('compromisos', 'responsable_cierre_id');
    }
  }
};
