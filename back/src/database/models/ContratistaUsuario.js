const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const ContratistaUsuario = sequelize.define('ContratistaUsuario', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    }
}, {
    tableName: 'contratista_usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ContratistaUsuario;
