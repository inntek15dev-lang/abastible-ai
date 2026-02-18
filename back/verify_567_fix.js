const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    try {
        const [check] = await sequelize.query("SELECT id FROM registros WHERE contratista_asignacion_id = 567");
        fs.writeFileSync('567_status.txt', `Remaining: ${check.length}`);
    } catch (e) {
        fs.writeFileSync('567_status.txt', 'Error: ' + e.message);
    } finally {
        await sequelize.close();
    }
})();
