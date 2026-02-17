// IEEE Trace: REQ-001 | US-001 | Actividad
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Actividad = sequelize.define('Actividad', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    elemento_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    actividad: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    criterios: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    template_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    frecuencia: {
        type: DataTypes.ENUM('mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique'),
        allowNull: false,
        defaultValue: 'mensual'
    },
    requiere_evidencia: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    },
    orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'actividades',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Actividad;
