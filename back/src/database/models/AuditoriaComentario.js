// IEEE Trace: REQ-003 | US-003 | AuditoriaComentario
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const AuditoriaComentario = sequelize.define('AuditoriaComentario', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    registro_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    comentario: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('general', 'actividad', 'evidencia'),
        allowNull: false,
        defaultValue: 'general'
    },
    registro_actividad_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    }
}, {
    tableName: 'auditoria_comentarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = AuditoriaComentario;
