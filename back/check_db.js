const { sequelize } = require('./src/database/models');

async function check() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query("DESCRIBE registros;");
        const statusCol = results.find(r => r.Field === 'estado_auditoria');
        console.log('--- COLUMN DEFINITION ---');
        console.log(JSON.stringify(statusCol, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

check();
