// Ejecuta la migración física de PK a usu_id (ID homologado de OvalControl).
// Uso: node scripts/run_usu_id_pk_migration.js   (desde back/, con .env configurado)
// Integrado al deploy: se invoca desde .github/workflows/deploy-prepro.yml y
// deploy-prod.yml, igual que scripts/ensure_schema.js.
//
// GUARD DE UNA SOLA EJECUCIÓN: al terminar con éxito, escribe la fila
// configuraciones.clave = 'migracion_usu_id_pk_completada'. En cada deploy posterior,
// el script detecta esa fila y sale de inmediato sin tocar la base de datos. Esto es
// deliberado y necesario, no solo una optimización: los pasos de esta migración
// (mover la PK, reservar el rango local, renumerar usuarios core) son de una sola vez
// por diseño — repetirlos en cada deploy re-renumeraría usuarios core que ya fueron
// desplazados a un ID distinto por una sincronización posterior, deshaciendo ese
// desplazamiento. Además de la bandera, se conserva como respaldo la verificación por
// esquema (paso 4) para el caso de que la fila de configuración se pierda pero la
// migración ya se haya aplicado.
//
// Resultado:
//  - users.usu_id: PRIMARY KEY NOT NULL AUTO_INCREMENT (contador desde 1.000.000,
//    rango reservado para usuarios locales; los usu_id de Oval se insertan explícitos)
//  - users.id: columna legacy nullable con índice único (fallbacks "usu_id || id")
//  - Usuarios core (rol admin, el superadmin del sistema): renumerados a los enteros
//    positivos más bajos posibles, sin colisionar con ningún usu_id migrado de Oval.
//    Es la única excepción a la homologación: nunca caen en el rango local alto.

const { sequelize, User, Configuracion } = require('../src/database/models');
const { renumberCoreUsersToMinimum } = require('../src/utils/usuIdHomologation');

const FLAG_CLAVE = 'migracion_usu_id_pk_completada';

async function run() {
    try {
        const flag = await Configuracion.findOne({ where: { clave: FLAG_CLAVE } });
        if (flag && flag.valor === '1') {
            console.log(`ℹ️ ${FLAG_CLAVE}=1: migración ya aplicada anteriormente. Nada que hacer.`);
            process.exit(0);
        }

        console.log('🔄 Iniciando migración física de PK a usu_id...');

        // 0. Usuarios core (admin) a los IDs más bajos posibles, antes del backfill
        //    general (para que nunca hereden un id legacy alto ni colisionen con Oval).
        const coreTx = await sequelize.transaction();
        try {
            const changes = await renumberCoreUsersToMinimum({ sequelize, User, transaction: coreTx });
            await coreTx.commit();
            if (changes.length > 0) {
                console.log(`✅ ${changes.length} usuario(s) core renumerado(s) a IDs mínimos.`);
            } else {
                console.log('ℹ️ Usuarios core ya están en su ID mínimo posible; sin cambios.');
            }
        } catch (coreErr) {
            await coreTx.rollback();
            throw coreErr;
        }

        // 1. Backfill: usuarios sin usu_id reciben su id legacy.
        const [, meta] = await sequelize.query('UPDATE users SET usu_id = id WHERE usu_id IS NULL');
        console.log(`✅ Backfill usu_id = id aplicado (${meta?.affectedRows ?? meta ?? 0} filas).`);

        // 2. Guard: duplicados de usu_id impiden crear la PK.
        const [dupes] = await sequelize.query(
            'SELECT usu_id, COUNT(*) AS n FROM users GROUP BY usu_id HAVING COUNT(*) > 1'
        );
        if (dupes.length > 0) {
            console.error('❌ usu_id duplicados en users; resuelva manualmente antes de continuar:');
            dupes.forEach(d => console.error(`   - usu_id ${d.usu_id} (x${d.n})`));
            process.exit(1);
        }

        // 3. Eliminar FKs físicas hacia users: validan contra la columna legacy `id` y
        //    rechazan los user_id homologados (usu_id de Oval). Ej: contratista_usuarios_ibfk_2.
        //    La integridad de estas columnas la gestiona la aplicación (igual que en
        //    registros, administraciones, etc., que nunca tuvieron FK física).
        const [fks] = await sequelize.query(`
            SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME = 'users'
        `);
        for (const f of fks) {
            console.log(`🔧 Eliminando FK ${f.CONSTRAINT_NAME}: ${f.TABLE_NAME}.${f.COLUMN_NAME} -> users.${f.REFERENCED_COLUMN_NAME}`);
            await sequelize.query(`ALTER TABLE \`${f.TABLE_NAME}\` DROP FOREIGN KEY \`${f.CONSTRAINT_NAME}\``);
        }
        if (fks.length > 0) {
            console.log(`✅ ${fks.length} FOREIGN KEY(s) hacia users eliminadas.`);
        } else {
            console.log('ℹ️ No hay FOREIGN KEYs físicas hacia users.');
        }

        // 4. Verificar estado actual (respaldo de idempotencia si la bandera se perdió).
        const [cols] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('id','usu_id')");
        const usuCol = cols.find(c => c.Field === 'usu_id');
        const alreadyMigrated = usuCol && usuCol.Key === 'PRI' && /auto_increment/i.test(usuCol.Extra || '');
        if (!alreadyMigrated) {
            // 5. Mover la PK: id pierde AUTO_INCREMENT, usu_id la recibe.
            await sequelize.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL');
            console.log('✅ id: AUTO_INCREMENT removido.');

            await sequelize.query('ALTER TABLE users DROP PRIMARY KEY');
            await sequelize.query('ALTER TABLE users MODIFY usu_id BIGINT UNSIGNED NOT NULL, ADD PRIMARY KEY (usu_id)');
            console.log('✅ PRIMARY KEY movida a usu_id.');

            await sequelize.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NULL');
            await sequelize.query('ALTER TABLE users ADD UNIQUE INDEX users_legacy_id_unique (id)');
            console.log('✅ id: ahora nullable con índice único (legacy).');

            await sequelize.query('ALTER TABLE users MODIFY usu_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
            await sequelize.query('ALTER TABLE users AUTO_INCREMENT = 1000000');
            console.log('✅ usu_id: AUTO_INCREMENT activado (contador desde 1.000.000).');
        } else {
            console.log('ℹ️ users.usu_id ya era PRIMARY KEY AUTO_INCREMENT (bandera ausente pero esquema ya migrado).');
        }

        await Configuracion.upsert({
            clave: FLAG_CLAVE,
            valor: '1',
            descripcion: 'Marca que la migración de PK a usu_id (homologación OvalControl) ya se ejecutó. No borrar salvo que se revierta la migración intencionalmente.',
            tipo: 'boolean'
        });
        console.log(`✅ Bandera ${FLAG_CLAVE}=1 registrada en configuraciones.`);

        console.log('🎉 Migración de PK a usu_id completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    }
}

run();
