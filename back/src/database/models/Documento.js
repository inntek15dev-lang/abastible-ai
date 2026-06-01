// IEEE Trace: REQ-013 | US-013 | Documento Model
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Documento = sequelize.define('Documento', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo_archivo: {
        type: DataTypes.STRING,
        allowNull: false // e.g., 'application/pdf', 'image/png'
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    entidad_tipo: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Polymorphic: "Licitacion", "Postulacion", "Empresa", "General"'
    },
    entidad_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true // Nullable for 'General' documents
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        comment: 'Usuario que subió el documento'
    }
}, {
    tableName: 'documentos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Documento;
