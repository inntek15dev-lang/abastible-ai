const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const VinculacionUsuario = sequelize.define('VinculacionUsuario', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    vinculacion_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    activo: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
    }
}, {
    tableName: 'vinculacion_usuarios',
    timestamps: true
});

module.exports = VinculacionUsuario;
