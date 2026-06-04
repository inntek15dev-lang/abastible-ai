// IEEE Trace: REQ-002 | ContratistaAsignacion
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ContratistaAsignacion = sequelize.define('ContratistaAsignacion', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    tipo_contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    dependencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    administrador_contrato_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    periodo_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'contratista_asignaciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ContratistaAsignacion;
