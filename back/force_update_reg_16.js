const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('Forcing update for Registro 16');
        // Find a valid assignment ID first
        const [results] = await sequelize.query("SELECT id FROM contratista_asignaciones WHERE activo = 1 LIMIT 1");
        if (results.length > 0) {
            const validId = results[0].id;
            console.log('Using valid assignment ID:', validId);
            await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${validId} WHERE id = 16`);
            console.log('Update executed.');

            // Verify
            const [check] = await sequelize.query("SELECT contratista_asignacion_id FROM registros WHERE id = 16");
            console.log('Verification:', check[0].contratista_asignacion_id);
        } else {
            console.log('No valid assignments found to link to.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sequelize.close();
    }
})();
