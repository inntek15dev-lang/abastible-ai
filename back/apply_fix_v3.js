const { sequelize } = require('./src/database/models');
const fs = require('fs');

async function fixAndCheck() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Define all states including the new ones
        const sql = "ALTER TABLE registros MODIFY COLUMN estado_auditoria ENUM('pendiente', 'auditando', 'auditada', 'reabierto', 'subsanado', 'reapertura_pendiente', 'en_revision', 'finalizado') NOT NULL DEFAULT 'pendiente';";

        console.log('Executing:', sql);
        await sequelize.query(sql);
        console.log('ALTER TABLE done.');

        const [results] = await sequelize.query("DESCRIBE registros;");
        const statusCol = results.find(r => r.Field === 'estado_auditoria');
        fs.writeFileSync('db_check.json', JSON.stringify(statusCol, null, 2));
        console.log('Check results written to db_check.json');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixAndCheck();
