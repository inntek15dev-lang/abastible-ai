// IEEE Trace: REQ-001 | TipoContratista (Servicio)
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const TipoContratista = sequelize.define('TipoContratista', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    programa_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    subgerencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
            model: 'subgerencias',
            key: 'id'
        }
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: 'tipos_contratista',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = TipoContratista;
