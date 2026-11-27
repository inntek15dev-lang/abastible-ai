'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('avisos', {
            id: {
                type: Sequelize.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            titulo: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            contenido: {
                type: Sequelize.TEXT('long'),
                allowNull: false
            },
            fecha_desde: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            fecha_hasta: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            para_todos: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            roles: {
                type: Sequelize.TEXT,
                allowNull: true,
                defaultValue: '[]'
            },
            activo: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            creado_por_id: {
                type: Sequelize.BIGINT.UNSIGNED,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'usu_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.addIndex('avisos', ['fecha_desde', 'fecha_hasta', 'activo'], {
            name: 'idx_avisos_fechas'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('avisos');
    }
};

