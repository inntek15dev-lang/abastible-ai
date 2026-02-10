// IEEE Trace: REQ-005 | US-005 | Evidencia
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Evidencia = sequelize.define('Evidencia', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    registro_actividad_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    nombre_original: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    nombre_archivo: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    ruta: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    tipo_mime: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tamano_bytes: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'evidencias',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Evidencia;
