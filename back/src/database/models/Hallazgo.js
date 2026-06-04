// IEEE Trace: REQ-003 | US-003 | Hallazgo
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Hallazgo = sequelize.define('Hallazgo', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    registro_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    registro_actividad_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    auditor_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('no_conformidad', 'observacion', 'oportunidad_mejora'),
        allowNull: false,
        defaultValue: 'observacion'
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    accion_correctiva: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('abierto', 'en_proceso', 'cerrado'),
        allowNull: false,
        defaultValue: 'abierto'
    },
    fecha_limite: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    fecha_cierre: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'hallazgos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Hallazgo;
