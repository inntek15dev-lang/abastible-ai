const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('--- FORCE FIX 567 START ---');

        // 1. Get valid assignment
        const [asigs] = await sequelize.query("SELECT id FROM contratista_asignaciones WHERE activo = 1 LIMIT 1");
        if (asigs.length === 0) {
            console.error('NO VALID ASSIGNMENTS FOUND! DOMMED.');
            process.exit(1);
        }
        const validId = asigs[0].id;
        console.log('Using valid ID:', validId);

        // 2. Identify bad records
        const [bad] = await sequelize.query("SELECT id FROM registros WHERE contratista_asignacion_id = 567");
        console.log('Bad Records:', bad.map(b => b.id));

        // 3. Update
        if (bad.length > 0) {
            await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${validId} WHERE contratista_asignacion_id = 567`);
            console.log('Update executed.');
        }

        // 4. Verify
        const [check] = await sequelize.query("SELECT id FROM registros WHERE contratista_asignacion_id = 567");
        console.log('Remaining:', check.length);

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
})();
