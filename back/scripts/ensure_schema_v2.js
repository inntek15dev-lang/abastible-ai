
/**
 * ensure_schema_v2.js
 * Enhanced schema consistency check for Misión Crítica.
 */
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_ROOT_PASSWORD || process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
    }
);

async function ensureSchema() {
    console.log('🚀 [PARKO] Iniciando Auditoría de Consistencia de Esquema...');
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa.');

        // Primero, asegurarnos de que las tablas existen (sincronización segura)
        console.log('🔄 Sincronizando tablas faltantes...');
        const models = require('../src/database/models'); // Importar modelos para que sequelize los conozca
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
            }
        ];

        for (const table of tablesToFix) {
            console.log(`\n📦 Tabla: ${table.name}`);
            try {
                const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${table.name}`);
                const existingColumns = columns.map(c => c.Field);

                for (const col of table.columns) {
                    if (!existingColumns.includes(col.name)) {
                        console.log(`  ➕ Añadiendo columna [${col.name}]...`);
                        const query = `ALTER TABLE ${table.name} ADD COLUMN ${col.name} ${col.type} ${col.after ? 'AFTER ' + col.after : ''}`;
                        await sequelize.query(query);
                        console.log(`  ✅ Columna [${col.name}] añadida.`);
                    } else {
                        console.log(`  ✔ Columna [${col.name}] ya existe.`);
                    }
                }
            } catch (tableError) {
                if (tableError.message.includes("doesn't exist")) {
                    console.error(`  ❌ Error: La tabla '${table.name}' no existe. La sincronización inicial falló o el modelo no está definido.`);
                } else {
                    console.error(`  ❌ Error verificando la tabla '${table.name}':`, tableError.message);
                }
            }
        }

        console.log('\n✨ Auditoría completada con éxito.');
    } catch (error) {
        console.error('\n❌ Error en auditoría:', error.message);
    } finally {
        await sequelize.close();
    }
}

ensureSchema();
