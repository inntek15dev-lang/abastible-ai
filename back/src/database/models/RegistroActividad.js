// IEEE Trace: REQ-002 | US-002 | RegistroActividad
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const RegistroActividad = sequelize.define('RegistroActividad', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    registro_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    actividad_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    cumple: {
        type: DataTypes.TINYINT(1),
        allowNull: true
    },
    cumple_auditor: {
        type: DataTypes.TINYINT(1),
        allowNull: true
    },
    responsable: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    descripcion_contratista: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    observacion_auditor: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    subsanado_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'registro_actividades',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = RegistroActividad;
