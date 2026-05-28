// IEEE Trace: REQ-007 | US-006, US-007 | User
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    usuario: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    usu_id_pizza: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'contratista_admin'
    },
    parent_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    tipo_contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    dependencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    eecc_nombre: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    rut: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;
