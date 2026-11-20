// IEEE Trace: REQ-007 | Avisos / Anuncios del Sistema
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Aviso = sequelize.define('Aviso', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    titulo: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    contenido: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
    fecha_desde: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_hasta: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    para_todos: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    roles: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
        get() {
            const raw = this.getDataValue('roles');
            if (!raw) return [];
            try {
                return typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch (e) {
                return [];
            }
        },
        set(val) {
            if (Array.isArray(val)) {
                this.setDataValue('roles', JSON.stringify(val));
            } else if (typeof val === 'string') {
                this.setDataValue('roles', val);
            } else {
                this.setDataValue('roles', '[]');
            }
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    creado_por_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
    }
}, {
    tableName: 'avisos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Aviso;

