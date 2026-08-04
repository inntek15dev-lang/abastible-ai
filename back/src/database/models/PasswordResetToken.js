// Recuperación de contraseña autónoma (contratista_user). El token crudo solo existe en
// el correo enviado al usuario; aquí se guarda su hash (SHA-256) para que una fuga de la
// base de datos no entregue tokens utilizables directamente.
const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false
    },
    token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = PasswordResetToken;
