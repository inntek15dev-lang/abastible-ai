// IEEE Trace: REQ-007 | US-006 | Role
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    guard_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'web'
    }
}, {
    tableName: 'roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Role;
