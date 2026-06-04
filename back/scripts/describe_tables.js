const DB_CONFIG = require('../src/config/database.js');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.username, DB_CONFIG.password, {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: DB_CONFIG.dialect,
    logging: false
});

async function main() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query('DESCRIBE actividades');
        console.log('--- Actividades ---');
        results.forEach(r => console.log(`${r.Field}: ${r.Type}`));

        const [results2] = await sequelize.query('DESCRIBE elementos');
        console.log('--- Elementos ---');
        results2.forEach(r => console.log(`${r.Field}: ${r.Type}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
