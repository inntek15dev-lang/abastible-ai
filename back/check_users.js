const { sequelize } = require('./src/database/models');

async function checkUsers() {
    try {
        const [results] = await sequelize.query('SELECT id, name, email, role, activo FROM users');
        console.table(results);
    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

checkUsers();
