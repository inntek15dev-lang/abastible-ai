'use strict';

// Completa la migración de clave primaria a usu_id (ID homologado de OvalControl):
//  - users.usu_id pasa a ser PRIMARY KEY NOT NULL AUTO_INCREMENT
//  - el contador arranca en 1.000.000 (rango reservado para usuarios locales sin cuenta
//    Oval; los usu_id de Oval observados están muy por debajo, se insertan explícitos)
//  - users.id queda como columna legacy nullable (los inserts nuevos ya no la llenan)
//
// Prerrequisitos verificados por la propia migración; aborta con mensaje claro si:
//  - existen usu_id duplicados (deben resolverse manualmente antes)
//  - existen FOREIGN KEYs físicas apuntando a users (habría que droparlas primero)

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

    // 3. Guard: FKs físicas hacia users (id o usu_id) bloquean el cambio de PK.
    const [fks] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = 'users'
    `);
    if (fks.length > 0) {
      throw new Error(
        `Existen FOREIGN KEYs físicas hacia users; elimínelas antes de cambiar la PK: ${fks
          .map((f) => `${f.TABLE_NAME}.${f.COLUMN_NAME} (${f.CONSTRAINT_NAME} -> users.${f.REFERENCED_COLUMN_NAME})`)
          .join(', ')}`
      );
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
