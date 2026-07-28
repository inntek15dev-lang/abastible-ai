'use strict';

// Completa la migración de clave primaria a usu_id (ID homologado de OvalControl):
//  - users.usu_id pasa a ser PRIMARY KEY NOT NULL AUTO_INCREMENT
//  - el contador arranca en 1.000.000 (rango reservado para usuarios locales sin cuenta
//    Oval; los usu_id de Oval observados están muy por debajo, se insertan explícitos)
//  - users.id queda como columna legacy nullable (los inserts nuevos ya no la llenan)
//
// Además elimina las FOREIGN KEYs físicas que referencian users(id) — p.ej.
// contratista_usuarios_ibfk_2 — porque validan contra la columna legacy y rechazan
// los user_id homologados. Aborta solo si existen usu_id duplicados (resolución manual).
//
// NOTA: este proyecto no tiene sequelize-cli instalado (sin script de migraciones), por
// lo que el entrypoint real es `back/src/run_usu_id_pk_migration.js` — ese script además
// renumera los usuarios core (rol admin) a sus IDs mínimos posibles antes del backfill
// (ver `renumberCoreUsersToMinimum` en utils/usuIdHomologation.js). Este archivo se
// mantiene como documentación/referencia equivalente para un entorno con sequelize-cli.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;

    // 1. Backfill: todo usuario sin usu_id recibe su id legacy (mismo criterio que
    //    run_migration.js). Ninguna tabla hija puede referenciar NULL, no requiere cascada.
    await sequelize.query('UPDATE users SET usu_id = id WHERE usu_id IS NULL');

    // 2. Guard: usu_id duplicados impiden crear la PK.
    const [dupes] = await sequelize.query(
      'SELECT usu_id, COUNT(*) AS n FROM users GROUP BY usu_id HAVING COUNT(*) > 1'
    );
    if (dupes.length > 0) {
      throw new Error(
        `No se puede crear PRIMARY KEY: usu_id duplicados en users: ${dupes
          .map((d) => `${d.usu_id} (x${d.n})`)
          .join(', ')}. Resuelva los duplicados y reintente.`
      );
    }

    // 3. Eliminar FKs físicas hacia users: validan contra la columna legacy `id` y
    //    rechazan los user_id homologados (usu_id de Oval). La integridad de estas
    //    columnas la gestiona la aplicación.
    const [fks] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = 'users'
    `);
    for (const f of fks) {
      await sequelize.query(`ALTER TABLE \`${f.TABLE_NAME}\` DROP FOREIGN KEY \`${f.CONSTRAINT_NAME}\``);
    }

    // 4. Quitar AUTO_INCREMENT de id (aún es PK, sigue NOT NULL por ahora).
    await sequelize.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL');

    // 5. Mover la PK a usu_id.
    await sequelize.query('ALTER TABLE users DROP PRIMARY KEY');
    await sequelize.query('ALTER TABLE users MODIFY usu_id BIGINT UNSIGNED NOT NULL, ADD PRIMARY KEY (usu_id)');

    // 6. id queda legacy: nullable (los inserts nuevos no la llenan) pero única para
    //    los fallbacks "usu_id || id" que aún existen en el código.
    await sequelize.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NULL');
    await sequelize.query('ALTER TABLE users ADD UNIQUE INDEX users_legacy_id_unique (id)');

    // 7. AUTO_INCREMENT en usu_id, contador en el rango local reservado.
    await sequelize.query('ALTER TABLE users MODIFY usu_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    await sequelize.query('ALTER TABLE users AUTO_INCREMENT = 1000000');
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    // Reversión best-effort al esquema anterior (id PK AUTO_INCREMENT, usu_id columna plana).
    await sequelize.query('ALTER TABLE users MODIFY usu_id BIGINT UNSIGNED NOT NULL');
    await sequelize.query('ALTER TABLE users DROP PRIMARY KEY');
    await sequelize.query('ALTER TABLE users DROP INDEX users_legacy_id_unique');
    await sequelize.query('UPDATE users SET id = usu_id WHERE id IS NULL');
    await sequelize.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL, ADD PRIMARY KEY (id)');
    await sequelize.query('ALTER TABLE users MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    await sequelize.query('ALTER TABLE users MODIFY usu_id BIGINT UNSIGNED NULL');
  }
};
