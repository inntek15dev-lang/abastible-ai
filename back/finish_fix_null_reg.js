const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    let log = '';
    try {
        log += '--- FINISH FIX START ---\n';

        // 1. Get valid assignment (simple)
        const [asigs] = await sequelize.query("SELECT id FROM contratista_asignaciones LIMIT 1");
        if (asigs.length > 0) {
            const validId = asigs[0].id;
            log += `Found valid ID: ${validId}. Updating Reg 16...\n`;
            await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${validId} WHERE id = 16`);

            const [checkValid] = await sequelize.query("SELECT contratista_asignacion_id FROM registros WHERE id = 16");
            log += `Final State: ${checkValid[0].contratista_asignacion_id}\n`;
        } else {
            log += 'No assignments found at all.\n';
        }

    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync('finish_status.txt', log);
        await sequelize.close();
    }
})();
