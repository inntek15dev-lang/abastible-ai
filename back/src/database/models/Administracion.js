// IEEE Trace: REQ-009 | Administracion Model
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Administracion = sequelize.define('Administracion', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    vinculacion_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    administrador_contrato_id: { // User ID
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    activo: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
    }
}, {
    tableName: 'administraciones',
    timestamps: true
});

module.exports = Administracion;
