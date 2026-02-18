/**
 * Migration: Unify 'auditada_sistema' and 'auditada_terreno' into 'auditada'
 * Strategy:
 * 1. Expand ENUM to include 'auditada'
 * 2. Update records to 'auditada'
 * 3. Shrink ENUM to remove old values
 */
const sequelize = require('../src/database/index');

async function migrate() {
    try {
        console.log('🔄 Starting migration to unify audit states...');

        // Step 1: Expand ENUM
        console.log('1. Expanding ENUM to include "auditada"...');
        await sequelize.query(`
            ALTER TABLE registros 
            MODIFY COLUMN estado_auditoria 
            ENUM('pendiente', 'auditando', 'auditada_terreno', 'auditada_sistema', 'reabierto', 'reapertura_pendiente', 'auditada') 
            NOT NULL DEFAULT 'pendiente'
        `);
        console.log('✅ ENUM expanded.');

        // Step 2: Update Data
        console.log('2. Updating records to "auditada"...');
        await sequelize.query("UPDATE registros SET estado_auditoria = 'auditada' WHERE estado_auditoria IN ('auditada_sistema', 'auditada_terreno')");
        console.log('✅ Records updated.');

        // Step 3: Shrink ENUM
        console.log('3. Cleanup ENUM definition...');
        await sequelize.query(`
            ALTER TABLE registros 
            MODIFY COLUMN estado_auditoria 
            ENUM('pendiente', 'auditando', 'auditada', 'reabierto', 'reapertura_pendiente') 
            NOT NULL DEFAULT 'pendiente'
        `);
        console.log('✅ ENUM cleaned up.');

        console.log('🚀 Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
