const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    let log = '';
    try {
        log += '--- SEED FIX V2 START ---\n';

        // 1. Get Service and Dep
        const [servs] = await sequelize.query("SELECT id FROM tipos_contratista LIMIT 1");
        const [deps] = await sequelize.query("SELECT id FROM dependencias LIMIT 1");

        if (servs.length > 0 && deps.length > 0) {
            const servId = servs[0].id;
            const depId = deps[0].id;
            const userId = 421; // The user associated with Reg 16

            log += `Creating assignment for User ${userId}, Tipo ${servId}, Dep ${depId}...\n`;

            // 2. Insert with correct columns
            // Schema: user_id, tipo_contratista_id, dependencia_id
            await sequelize.query(`INSERT INTO contratista_asignaciones (user_id, tipo_contratista_id, dependencia_id, created_at, updated_at) VALUES (${userId}, ${servId}, ${depId}, NOW(), NOW())`);

            // 3. Get new ID
            const [last] = await sequelize.query("SELECT id FROM contratista_asignaciones ORDER BY id DESC LIMIT 1");
            const newAsigId = last[0].id;
            log += `New Asig ID: ${newAsigId}\n`;

            // 4. Update Registry 16
            await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${newAsigId} WHERE id = 16`);

            // 5. Verify
            const [chk] = await sequelize.query("SELECT contratista_asignacion_id FROM registros WHERE id = 16");
            log += `Final Registry State: ${chk[0].contratista_asignacion_id}\n`;

        } else {
            log += 'No Services or Dependencies found.\n';
        }

    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync('seed_v2_status.txt', log);
        await sequelize.close();
    }
})();
