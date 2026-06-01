const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    let log = '';
    try {
        log += '--- NULLIFY AND FIX START ---\n';

        // 1. Nullify
        log += 'Attempting to set to NULL...\n';
        await sequelize.query("UPDATE registros SET contratista_asignacion_id = NULL WHERE id = 16");

        const [checkNull] = await sequelize.query("SELECT contratista_asignacion_id FROM registros WHERE id = 16");
        log += `After Nullify: ${checkNull[0].contratista_asignacion_id}\n`;

        if (checkNull[0].contratista_asignacion_id === null) {
            // 2. Set to Valid
            const [asigs] = await sequelize.query("SELECT id FROM contratista_asignaciones WHERE activo = 1 LIMIT 1");
            if (asigs.length > 0) {
                const validId = asigs[0].id;
                log += `Found valid ID: ${validId}. Updating...\n`;
                await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${validId} WHERE id = 16`);

                const [checkValid] = await sequelize.query("SELECT contratista_asignacion_id FROM registros WHERE id = 16");
                log += `After Update: ${checkValid[0].contratista_asignacion_id}\n`;
            }
        } else {
            log += 'Nullify FAILED. Stuck on: ' + checkNull[0].contratista_asignacion_id + '\n';
        }

    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync('nullify_status.txt', log);
        await sequelize.close();
    }
})();
