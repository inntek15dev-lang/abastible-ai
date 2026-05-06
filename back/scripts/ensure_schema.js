/**
 * ensure_schema.js
 * Automatically checks for and adds missing columns to the database
 * to match the model definitions. Use this to fix 500 errors on remote servers.
 */
const sequelize = require('../src/database');
const models = require('../src/database/models');

async function ensureSchema() {
    console.log('🚀 Starting Database Schema Consistency Check...');
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        // Primero aseguramos que las tablas existan (útil para despliegues en bases de datos vacías)
        console.log('🔄 Sincronizando tablas faltantes...');
        await models.sequelize.sync({ alter: false });
        console.log('✅ Sincronización base completada.');

        const tablesToFix = [
            {
                name: 'registros',
                columns: [
                    { name: 'programa_id', type: 'BIGINT UNSIGNED NULL', after: 'contratista_asignacion_id' },
                    { name: 'dependencia_id', type: 'BIGINT UNSIGNED NULL', after: 'programa_id' }
                ]
            },
            {
                name: 'users',
                columns: [
                    { name: 'contratista_id', type: 'BIGINT UNSIGNED NULL', after: 'parent_id' },
                    { name: 'tipo_contratista_id', type: 'BIGINT UNSIGNED NULL', after: 'contratista_id' },
                    { name: 'dependencia_id', type: 'BIGINT UNSIGNED NULL', after: 'tipo_contratista_id' },
                    { name: 'eecc_nombre', type: 'VARCHAR(255) NULL', after: 'dependencia_id' },
                    { name: 'rut', type: 'VARCHAR(20) NULL', after: 'eecc_nombre' },
                    { name: 'telefono', type: 'VARCHAR(50) NULL', after: 'rut' }
                ]
            },
            {
                name: 'actividades',
                columns: [
                    { name: 'template_url', type: 'VARCHAR(255) NULL', after: 'criterios' }
                ]
            }
        ];

        for (const table of tablesToFix) {
            console.log(`\nTable: ${table.name}`);
            try {
                // Verificar si la tabla existe antes de pedir columnas
                const [tableExists] = await sequelize.query(`SHOW TABLES LIKE '${table.name}'`);
                if (tableExists.length === 0) {
                    console.log(`  ⚠️ Table '${table.name}' does not exist. Skipping column check (sync will handle creation).`);
                    continue;
                }

                const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${table.name}`);
                const existingColumns = columns.map(c => c.Field);

                for (const col of table.columns) {
                    if (!existingColumns.includes(col.name)) {
                        console.log(`  ➕ Adding column [${col.name}]...`);
                        const query = `ALTER TABLE ${table.name} ADD COLUMN ${col.name} ${col.type} ${col.after ? 'AFTER ' + col.after : ''}`;
                        await sequelize.query(query);
                        console.log(`  ✅ Column [${col.name}] added.`);
                    } else {
                        console.log(`  ✔ Column [${col.name}] already exists.`);
                    }
                }
            } catch (tableError) {
                console.error(`  ❌ Error verifying table '${table.name}':`, tableError.message);
            }
        }

        console.log('\n✨ Schema verification completed successfully.');
    } catch (error) {
        console.error('\n❌ Error ensuring schema:', error.message);
    } finally {
        await sequelize.close();
    }
}

ensureSchema();
