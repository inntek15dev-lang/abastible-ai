// IEEE Trace: REQ-012 | RegistroLog
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const RegistroLog = sequelize.define('RegistroLog', {
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
        allowNull: true
    },
    accion: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    datos_anteriores: {
        type: DataTypes.JSON,
        allowNull: true
    },
    datos_nuevos: {
        type: DataTypes.JSON,
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    }
}, {
    tableName: 'registro_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = RegistroLog;
