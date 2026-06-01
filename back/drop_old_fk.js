const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('Dropping contratista_asignacion_id from compromisos...');
        // First drop the FK constraint
        try {
            await sequelize.query("ALTER TABLE compromisos DROP FOREIGN KEY compromisos_ibfk_5");
            console.log('FK Dropped');
        } catch (e) {
            console.log('FK might not exist or name is different:', e.message);
        }

        // Then drop the column
        await sequelize.query("ALTER TABLE compromisos DROP COLUMN contratista_asignacion_id");
        console.log('Column Dropped');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
})();
