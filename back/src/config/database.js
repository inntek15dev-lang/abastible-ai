// Carga dotenv para que funcione localmente o en scripts de CLI
require('dotenv').config();

module.exports = {
  // Asegúrate de que el nombre coincida con lo que pasas en el flag --env
  preproduction: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD, // <--- Verifica que esta variable sea igual al .env
    database: process.env.DB_NAME || 'abastible_oiem_preprod',
    host: process.env.DB_HOST || 'db',
    dialect: 'mysql', // <--- Esto soluciona el error del Dialect
    logging: false
  }
};