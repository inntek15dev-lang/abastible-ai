const sequelize = require('./src/database');

async function fixSchema() {
    console.log('👷 Fixing schema for "registros" table...');
    try {
        // Add programa_id
        console.log('  Adding programa_id column...');
        await sequelize.query('ALTER TABLE registros ADD COLUMN programa_id BIGINT UNSIGNED NULL AFTER contratista_asignacion_id');

        // Add dependencia_id
        console.log('  Adding dependencia_id column...');
        await sequelize.query('ALTER TABLE registros ADD COLUMN dependencia_id BIGINT UNSIGNED NULL AFTER programa_id');

        console.log('✅ Columns added successfully.');

        // Add foreign keys (optional but recommended)
        try {
            console.log('  Adding foreign key for programa_id...');
            await sequelize.query('ALTER TABLE registros ADD CONSTRAINT fk_registros_programa FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE SET NULL');

            console.log('  Adding foreign key for dependencia_id...');
            await sequelize.query('ALTER TABLE registros ADD CONSTRAINT fk_registros_dependencia FOREIGN KEY (dependencia_id) REFERENCES dependencias(id) ON DELETE SET NULL');

            console.log('✅ Foreign keys added.');
        } catch (fkError) {
            console.warn('⚠️ Could not add foreign keys (maybe they already exist or there are data conflicts):', fkError.message);
        }

    } catch (error) {
        console.error('❌ Error fixing schema:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixSchema();
