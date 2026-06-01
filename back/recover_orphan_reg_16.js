const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    let log = '';
    try {
        log += '--- RECOVER ORPHAN REG 16 START ---\n';

        // 1. Reparent to User 2
        log += 'Updating user_id to 2...\n';
        await sequelize.query("UPDATE registros SET user_id = 2 WHERE id = 16");

        // 2. Create Assignment for User 2
        // Get generic service/dep
        const [servs] = await sequelize.query("SELECT id FROM tipos_contratista LIMIT 1");
        const [deps] = await sequelize.query("SELECT id FROM dependencias LIMIT 1");

        if (servs.length > 0 && deps.length > 0) {
            const servId = servs[0].id;
            const depId = deps[0].id;
            const userId = 2;

            log += `Creating assignment for User ${userId}, Tipo ${servId}, Dep ${depId}...\n`;

            await sequelize.query(`INSERT INTO contratista_asignaciones (user_id, tipo_contratista_id, dependencia_id, created_at, updated_at) VALUES (${userId}, ${servId}, ${depId}, NOW(), NOW())`);

            const [last] = await sequelize.query("SELECT id FROM contratista_asignaciones ORDER BY id DESC LIMIT 1");
            const newAsigId = last[0].id;
            log += `New Asig ID: ${newAsigId}\n`;

            // 3. Update Registry 16 Assignment
            await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${newAsigId} WHERE id = 16`);
            log += `Registro 16 updated to Asig ${newAsigId}.\n`;

            // 4. Verify
            const [chk] = await sequelize.query("SELECT user_id, contratista_asignacion_id FROM registros WHERE id = 16");
            log += `Final State: User ${chk[0].user_id}, Asig ${chk[0].contratista_asignacion_id}\n`;

        } else {
            log += 'No Services found.\n';
        }

    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync('recover_status.txt', log);
        await sequelize.close();
    }
})();
