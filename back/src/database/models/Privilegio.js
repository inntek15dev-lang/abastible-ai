// IEEE Trace: REQ-007 | US-006 | Privilegio
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Privilegio = sequelize.define('Privilegio', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    role_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    ref_modulo: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    read: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0
    },
    write: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0
    },
    excec: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'privilegios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Privilegio;
