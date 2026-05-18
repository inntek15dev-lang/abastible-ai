// IEEE Trace: REQ-010 | US-010 | Compromiso
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Compromiso = sequelize.define('Compromiso', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    hallazgo_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    registro_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    responsable_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    creado_por_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },

    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    fecha_compromiso: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'en_proceso', 'cumplido', 'vencido'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    fecha_cumplimiento: {
        type: DataTypes.DATE,
        allowNull: true
    },
    observacion_cumplimiento: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ruta_evidencia: {
        type: DataTypes.STRING,
        allowNull: true
    },
    comentario_evidencia: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'compromisos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Compromiso;
