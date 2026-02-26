// IEEE Trace: REQ-007 | US-006 | config/database
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const sslOptions = process.env.DB_SSL === 'true' ? {
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, '../../certs/ca.pem')),
    rejectUnauthorized: true
  }
} : {};

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'abastible_ai',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  dialect: 'mysql',
  dialectOptions: {
    ...sslOptions
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
