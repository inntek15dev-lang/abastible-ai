const { sequelize } = require('../models');

async function testConn() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        const [results] = await sequelize.query('SELECT 1 as result');
        console.log('Query result:', results);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

testConn();
