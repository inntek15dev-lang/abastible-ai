'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add subgerencia_id to tipos_contratista (Servicios)
    await queryInterface.addColumn('tipos_contratista', 'subgerencia_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'subgerencias',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 2. Remove nivel_faena from dependencias
    await queryInterface.removeColumn('dependencias', 'nivel_faena');
  },

  async down(queryInterface, Sequelize) {
    // 1. Add back nivel_faena to dependencias
    await queryInterface.addColumn('dependencias', 'nivel_faena', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Alineación con niveles faena de ASEM (Gerencia, Subgerencia, Planta, Almacén, etc.)'
    });

    // 2. Remove subgerencia_id from tipos_contratista
    await queryInterface.removeColumn('tipos_contratista', 'subgerencia_id');
  },
};
