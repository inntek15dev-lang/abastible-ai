require('dotenv').config({ path: '../../back/.env' });
const sequelize = require('../../back/src/database');

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection to Aiven has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the Aiven database:', error);
    } finally {
        process.exit(0);
    }
}

testConnection();
