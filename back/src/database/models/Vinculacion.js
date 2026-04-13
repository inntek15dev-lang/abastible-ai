// IEEE Trace: REQ-009 | Vinculacion Model
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Vinculacion = sequelize.define('Vinculacion', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    contratista_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    servicio_id: { // Maps to TipoContratista currently
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    dependencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    subgerencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    periodo_inicio: {
        type: DataTypes.DATE,
        allowNull: true
    },
    numero_contrato: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    fecha_inicio_contrato: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    fecha_termino_contrato: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    activo: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1
    }
}, {
    tableName: 'vinculaciones',
    timestamps: true
});

module.exports = Vinculacion;
