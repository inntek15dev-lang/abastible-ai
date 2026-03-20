// IEEE Trace: REQ-001 | Dependencia
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Dependencia = sequelize.define('Dependencia', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    },
    subgerencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
            model: 'subgerencias',
            key: 'id'
        }
    },
    nivel_faena: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Alineación con niveles faena de ASEM (Gerencia, Subgerencia, Planta, Almacén, etc.)'
    }
}, {
    tableName: 'dependencias',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Dependencia;
