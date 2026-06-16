const DB_CONFIG = require('../src/config/database.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.username, DB_CONFIG.password, {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: DB_CONFIG.dialect,
    logging: false
});

async function verify() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        const [results] = await sequelize.query("SELECT * FROM programas WHERE nombre = 'OIEM Distribución Granel'");
        console.log('Program:', results);

        if (results.length > 0) {
            const progId = results[0].id;
            const [elems] = await sequelize.query(`SELECT * FROM elementos WHERE programa_id = ${progId}`);
            console.log(`Elements count: ${elems.length}`);
            if (elems.length > 0) {
                console.log('First Element:', elems[0]);
                const [acts] = await sequelize.query(`SELECT * FROM actividades WHERE elemento_id = ${elems[0].id}`);
                console.log(`Activities for first element: ${acts.length}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verify();
