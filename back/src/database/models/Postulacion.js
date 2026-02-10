// IEEE Trace: REQ-012 | US-012 | Postulacion Model
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Postulacion = sequelize.define('Postulacion', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    licitacion_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Usuario (Contratista) que postula'
    },
    oferta_economica: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    oferta_tecnica: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción o link a propuesta técnica'
    },
    estado: {
        type: DataTypes.ENUM('enviada', 'en_revision', 'aceptada', 'rechazada'),
        defaultValue: 'enviada'
    },
    fecha_envio: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'postulaciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Postulacion;
