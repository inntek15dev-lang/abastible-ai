// IEEE Trace: REQ-002 | US-002 | Registro
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Registro = sequelize.define('Registro', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    contratista_asignacion_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },

    programa_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    dependencia_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    periodo: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    eecc_nombre: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    dependencia: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    personas_nuevas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    supervisores: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    prevencionistas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    dotacion_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    porcentaje_cumplimiento: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    porcentaje_cumplimiento_auditor: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    auditado: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0
    },
    cerrado: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 0
    },
    estado_auditoria: {
        type: DataTypes.ENUM('pendiente', 'auditando', 'auditada', 'reabierto', 'subsanado', 'reapertura_pendiente', 'reapertura_solicitada', 'pendiente_subsanacion', 'en_revision', 'finalizado'),
        allowNull: false,
        defaultValue: 'pendiente'
    },
    tipo_auditoria: {
        type: DataTypes.ENUM('sistema', 'terreno'),
        allowNull: true
    },
    auditado_por: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    },
    fecha_auditoria: {
        type: DataTypes.DATE,
        allowNull: true
    },
    observaciones_auditoria: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha_limite_subsanacion: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'registros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Registro;
