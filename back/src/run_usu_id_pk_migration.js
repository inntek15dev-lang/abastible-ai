// Ejecuta la migración física de PK a usu_id (ID homologado de OvalControl).
// Uso: node src/run_usu_id_pk_migration.js   (desde back/, con .env configurado)
//
// Equivale a la migración 20260727120000-make-usu-id-primary-key.js (el proyecto no
// tiene sequelize-cli instalado, por eso este script standalone, mismo patrón que
// run_migration.js).
//
// Resultado:
//  - users.usu_id: PRIMARY KEY NOT NULL AUTO_INCREMENT (contador desde 1.000.000,
//    rango reservado para usuarios locales; los usu_id de Oval se insertan explícitos)
//  - users.id: columna legacy nullable con índice único (fallbacks "usu_id || id")

const { sequelize } = require('./database/models');

async function run() {
    try {
        console.log('🔄 Iniciando migración física de PK a usu_id...');

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

        // 3. Guard: FKs físicas hacia users bloquean el cambio de PK.
        const [fks] = await sequelize.query(`
            SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME = 'users'
        `);
        if (fks.length > 0) {
            console.error('❌ Existen FOREIGN KEYs físicas hacia users; elimínelas antes de cambiar la PK:');
            fks.forEach(f => console.error(`   - ${f.TABLE_NAME}.${f.COLUMN_NAME} (${f.CONSTRAINT_NAME} -> users.${f.REFERENCED_COLUMN_NAME})`));
            process.exit(1);
        }

        // 4. Verificar estado actual (idempotencia básica).
        const [cols] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field IN ('id','usu_id')");
        const usuCol = cols.find(c => c.Field === 'usu_id');
        if (usuCol && usuCol.Key === 'PRI' && /auto_increment/i.test(usuCol.Extra || '')) {
            console.log('ℹ️ users.usu_id ya es PRIMARY KEY AUTO_INCREMENT. Nada que hacer.');
            process.exit(0);
        }

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

        console.log('🎉 Migración de PK a usu_id completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    }
}

run();
