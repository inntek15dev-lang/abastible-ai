// IEEE Trace: REQ-006 | Configuracion
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Configuracion = sequelize.define('Configuracion', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    clave: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    valor: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    descripcion: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    tipo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'string'
    }
}, {
    tableName: 'configuraciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Configuracion;
