// IEEE Trace: REQ-007 | database/index
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: config.logging,
        define: config.define,
        pool: config.pool
    }
);

module.exports = sequelize;
