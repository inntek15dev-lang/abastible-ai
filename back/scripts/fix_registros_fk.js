const { sequelize } = require('../src/database/models');

async function fixForeignKey() {
    console.log('🔄 Fixing foreign key for "registros" table...');
    try {
        // 1. Find the current constraint name that points to contratista_asignaciones
        const [results] = await sequelize.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'registros' 
            AND COLUMN_NAME = 'contratista_asignacion_id' 
            AND REFERENCED_TABLE_NAME = 'contratista_asignaciones'
            LIMIT 1
        `);

        if (results.length > 0) {
            const constraintName = results[0].CONSTRAINT_NAME;
            console.log(`  🗑️ Dropping legacy constraint: ${constraintName}...`);
            await sequelize.query(`ALTER TABLE registros DROP FOREIGN KEY ${constraintName}`);
            console.log('  ✅ Legacy constraint dropped.');
        } else {
            console.log('  ℹ️ No legacy constraint to contratista_asignaciones found.');
        }

        // 2. Check if the new constraint already exists
        const [newResults] = await sequelize.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'registros' 
            AND COLUMN_NAME = 'contratista_asignacion_id' 
            AND REFERENCED_TABLE_NAME = 'vinculaciones'
            LIMIT 1
        `);

        if (newResults.length === 0) {
            console.log('  🏗️ Adding new constraint to vinculaciones...');
            await sequelize.query('ALTER TABLE registros ADD CONSTRAINT fk_registros_vinculacion FOREIGN KEY (contratista_asignacion_id) REFERENCES vinculaciones(id) ON DELETE SET NULL ON UPDATE CASCADE');
            console.log('  ✅ New constraint added successfully.');
        } else {
            console.log('  ✅ Constraint to vinculaciones already exists.');
        }

        console.log('🎉 Database alignment complete!');
    } catch (error) {
        console.error('❌ Error during database alignment:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixForeignKey();
