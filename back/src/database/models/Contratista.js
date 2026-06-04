// IEEE Trace: REQ-009 | Contratista Model
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Contratista = sequelize.define('Contratista', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    rut: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    email_contacto: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    activo: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
    }
}, {
    tableName: 'contratistas',
    timestamps: true
});

module.exports = Contratista;
