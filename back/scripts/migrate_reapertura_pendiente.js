/**
 * Migration: Add 'reapertura_pendiente' to registros.estado_auditoria ENUM
 *            Add 'estado_previo' column to solicitudes_reapertura
 */
const sequelize = require('../src/database/index');

async function migrate() {
    try {
        console.log('Adding reapertura_pendiente to registros.estado_auditoria ENUM...');
        await sequelize.query(`
            ALTER TABLE registros 
            MODIFY COLUMN estado_auditoria 
            ENUM('pendiente','auditando','auditada_terreno','auditada_sistema','reabierto','reapertura_pendiente') 
            NOT NULL DEFAULT 'pendiente'
        `);
        console.log('✅ ENUM updated');

        console.log('Adding estado_previo column to solicitudes_reapertura...');
        try {
            await sequelize.query(`
                ALTER TABLE solicitudes_reapertura 
                ADD COLUMN estado_previo VARCHAR(50) NULL
            `);
            console.log('✅ estado_previo column added');
        } catch (e) {
            if (e.message.includes('Duplicate column')) {
                console.log('✅ estado_previo column already exists');
            } else {
                throw e;
            }
        }

        console.log('Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
