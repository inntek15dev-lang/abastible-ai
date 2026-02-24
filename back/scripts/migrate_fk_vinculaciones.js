/**
 * Migrate FK: registros.contratista_asignacion_id
 * Old: references contratista_asignaciones(id)
 * New: references vinculaciones(id)
 */
const sequelize = require('../src/database');

(async () => {
    try {
        console.log('Dropping old FK constraint registros_ibfk_2...');
        await sequelize.query('ALTER TABLE registros DROP FOREIGN KEY registros_ibfk_2');
        console.log('Done.');

        console.log('Adding new FK constraint referencing vinculaciones...');
        await sequelize.query(
            'ALTER TABLE registros ADD CONSTRAINT registros_vinculacion_fk FOREIGN KEY (contratista_asignacion_id) REFERENCES vinculaciones(id) ON DELETE SET NULL ON UPDATE CASCADE'
        );
        console.log('Done.');

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
