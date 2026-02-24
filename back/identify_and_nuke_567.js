const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    let log = '';
    try {
        const [bad] = await sequelize.query("SELECT id FROM registros WHERE contratista_asignacion_id = 567");
        log += `Bad IDs: ${bad.map(b => b.id).join(', ')}\n`;

        if (bad.length > 0) {
            log += 'Attempting DELETE...\n';
            try {
                await sequelize.query("DELETE FROM registros WHERE contratista_asignacion_id = 567");
                log += 'DELETE executed.\n';
            } catch (delErr) {
                log += `DELETE Failed: ${delErr.message}\n`;
            }
        } else {
            log += 'No records found to delete.\n';
        }

        const [check] = await sequelize.query("SELECT id FROM registros WHERE contratista_asignacion_id = 567");
        log += `Final Check: ${check.length}\n`;

    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync('nuke_status.txt', log);
        await sequelize.close();
    }
})();
