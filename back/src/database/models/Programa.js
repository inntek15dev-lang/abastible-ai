// IEEE Trace: REQ-001 | US-001 | Programa
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Programa = sequelize.define('Programa', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    meta_cumplimiento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'programas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Programa;
