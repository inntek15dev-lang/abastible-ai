// IEEE Trace: REQ-001 | Gerencia
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Gerencia = sequelize.define('Gerencia', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
            model: 'contratistas',
            key: 'id'
        }
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'gerencias',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Gerencia;
