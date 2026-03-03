require('dotenv').config();

module.exports = {
  preproduction: { // O 'development', según tu NODE_ENV
    username: process.env.DB_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'db',
    dialect: 'mysql'
  }
};