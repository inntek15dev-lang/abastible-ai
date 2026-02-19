const { sequelize } = require('./src/database/models');

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        await sequelize.query("ALTER TABLE registros MODIFY COLUMN estado_auditoria ENUM('pendiente', 'auditando', 'auditada', 'reabierto', 'subsanado', 'reapertura_pendiente', 'en revision', 'finalizado') NOT NULL DEFAULT 'pendiente';");
        console.log('ALTER TABLE successful: estado_auditoria ENUM updated with en revision and finalizado.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fix();
