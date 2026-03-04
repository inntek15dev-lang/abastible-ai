require('dotenv').config();

const config = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_ROOT_PASSWORD, // Asegúrate de que este nombre sea igual al del .env
  database: process.env.DB_NAME || 'abastible_oiem_preprod',
  host: process.env.DB_HOST || 'db',
  dialect: 'mysql',
  logging: false,
};

module.exports = {
  development: config,
  preproduction: config,
  production: config
};