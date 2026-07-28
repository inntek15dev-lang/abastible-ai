// Elimina TODAS las FOREIGN KEY físicas del esquema.
// Uso: node scripts/drop_physical_foreign_keys.js   (desde back/, con .env configurado)
// Integrado al deploy (.github/workflows/deploy-prepro.yml y deploy-prod.yml), corre
// ANTES de scripts/run_usu_id_pk_migration.js.
//
// POR QUÉ: la aplicación gestiona TODA la integridad referencial en código propio (ver
// utils/usuIdHomologation.js, run_migration.js, y la sincronización con OVAL en
// syncController.js, que borra entidades residuales aceptando huérfanos en tablas no
// migrables a propósito). Ninguna asociación de Sequelize en este proyecto depende de
// que MySQL aplique una FK física. Sin embargo, el esquema real tiene constraints físicas
// que nadie declaró a propósito en el código de este repo (ni en migrations/, ni en los
// modelos) — probablemente creadas por `sequelize.sync()` en algún momento a partir de
// los `references:` de los modelos, o por un dump/DDL manual. Dos de ellas ya bloquearon
// la sincronización con OVAL en producción/prepro:
//   - contratista_usuarios_ibfk_2 (users.id)              -> ver run_usu_id_pk_migration.js
//   - contratista_asignaciones_ibfk_2 (tipos_contratista.id) -> encontrada al sincronizar servicios
// Dado que ninguna auditoría estática del código puede garantizar encontrarlas todas
// (no están declaradas en ningún archivo de este repo), la solución robusta es eliminar
// TODAS las FK físicas de una vez, en lugar de ir descubriéndolas una por una cada vez
// que la re-sincronización full toca una entidad nueva.
//
// GUARD DE UNA SOLA EJECUCIÓN: igual que run_usu_id_pk_migration.js, se guarda en
// configuraciones.clave='fks_fisicas_eliminadas' al terminar. Además es naturalmente
// idempotente: en una segunda ejecución no encuentra FKs que eliminar (loop vacío).

const { sequelize, Configuracion } = require('../src/database/models');

const FLAG_CLAVE = 'fks_fisicas_eliminadas';

async function run() {
    try {
        const flag = await Configuracion.findOne({ where: { clave: FLAG_CLAVE } });
        if (flag && flag.valor === '1') {
            console.log(`ℹ️ ${FLAG_CLAVE}=1: ya se eliminaron las FKs físicas anteriormente. Verificando de todas formas por si se agregó alguna nueva...`);
        }

        const [fks] = await sequelize.query(`
            SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

        if (fks.length === 0) {
            console.log('ℹ️ No hay FOREIGN KEYs físicas en el esquema. Nada que hacer.');
        } else {
            console.log(`🔎 ${fks.length} FOREIGN KEY(s) física(s) encontradas:`);
            for (const f of fks) {
                console.log(`   - ${f.TABLE_NAME}.${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME} (${f.CONSTRAINT_NAME})`);
            }
            for (const f of fks) {
                try {
                    await sequelize.query(`ALTER TABLE \`${f.TABLE_NAME}\` DROP FOREIGN KEY \`${f.CONSTRAINT_NAME}\``);
                    console.log(`✅ Eliminada: ${f.TABLE_NAME}.${f.CONSTRAINT_NAME}`);
                } catch (err) {
                    // Ya pudo haber sido eliminada por otro paso (p.ej. run_usu_id_pk_migration.js
                    // también elimina las FKs hacia users). No es un error real, seguir.
                    console.warn(`⚠️ No se pudo eliminar ${f.TABLE_NAME}.${f.CONSTRAINT_NAME} (probablemente ya no existe): ${err.message}`);
                }
            }
        }

        await Configuracion.upsert({
            clave: FLAG_CLAVE,
            valor: '1',
            descripcion: 'Marca que se eliminaron las FK físicas del esquema (la app gestiona la integridad referencial en código). Se revisa en cada deploy por si aparece alguna nueva.',
            tipo: 'boolean'
        });

        console.log('🎉 Verificación de FKs físicas completada.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error eliminando FKs físicas:', error.message);
        process.exit(1);
    }
}

run();
