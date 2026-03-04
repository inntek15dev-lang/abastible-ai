const { Sequelize } = require('sequelize');
const dbConfigs = require('../config/database');

// Capturamos el ambiente o usamos 'development' por defecto
const env = process.env.NODE_ENV || 'development';

// IMPORTANTE: Verifica si existe la clave en el archivo de configuración
const config = dbConfigs[env];

if (!config || !config.dialect) {
    console.error(`❌ ERROR: No se encontró configuración válida para el entorno: "${env}"`);
    console.log('Configuraciones disponibles:', Object.keys(dbConfigs));
    // Fallback de emergencia para evitar el crash del Dialect
    process.exit(1);
}

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        dialect: config.dialect, // Aquí es donde fallaba antes
        logging: config.logging,
        port: config.port || 3306
    }
);

module.exports = sequelize;