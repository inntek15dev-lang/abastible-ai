const {
    sequelize,
    Registro,
    Actividad,
    Programa,
    Dependencia,
    User,
    ContratistaAsignacion
} = require('../database/models');

async function verifySchema() {
    try {
        console.log('🔍 Verifying database schema...');

        const modelsToCheck = [
            { model: Registro, tableName: 'registros' },
            { model: Actividad, tableName: 'actividades' },
            { model: Programa, tableName: 'programas' },
            { model: Dependencia, tableName: 'dependencias' },
            { model: User, tableName: 'users' },
            { model: ContratistaAsignacion, tableName: 'contratista_asignaciones' }
        ];

        let hasErrors = false;

        for (const { model, tableName } of modelsToCheck) {
            console.log(`\nChecking table: ${tableName}`);
            const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`);
            const dbColumnNames = columns.map(c => c.Field);
            const modelAttributes = Object.keys(model.rawAttributes);

            const missingInDb = modelAttributes.filter(attr => !dbColumnNames.includes(attr));

            if (missingInDb.length > 0) {
                console.error(`❌ Mismatch in ${tableName}: Missing columns in DB -> ${missingInDb.join(', ')}`);
                hasErrors = true;
            } else {
                console.log(`✅ ${tableName} is in sync.`);
            }
        }

        if (hasErrors) {
            console.error('\n❌ SQL Schema Sync FAILED. Fix database before proceeding.');
            process.exit(1);
        } else {
            console.log('\n✅ All schemas verified successfully.');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Error verifying schema:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

verifySchema();
