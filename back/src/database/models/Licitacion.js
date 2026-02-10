// IEEE Trace: REQ-011 | US-011 | Licitacion Model
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Licitacion = sequelize.define('Licitacion', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    fecha_inicio: {
        type: DataTypes.DATE,
        allowNull: false
    },
    fecha_fin: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM('borrador', 'abierta', 'cerrada', 'adjudicada'),
        defaultValue: 'borrador'
    },
    presupuesto_referencial: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Usuario que creó la licitación'
    }
}, {
    tableName: 'licitaciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Licitacion;
