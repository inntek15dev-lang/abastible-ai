// IEEE Trace: REQ-004 | US-004 | SolicitudReapertura
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const SolicitudReapertura = sequelize.define('SolicitudReapertura', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    registro_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    solicitante_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    aprobador_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    respuesta: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha_respuesta: {
        type: DataTypes.DATE,
        allowNull: true
    },
    estado_previo: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'solicitudes_reapertura',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SolicitudReapertura;
