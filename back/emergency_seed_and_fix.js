const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    let log = '';
    try {
        log += '--- EMERGENCY SEED AND FIX START ---\n';

        // 1. Verify existence of dependencies for assignment
        // Contractor 421 exists (from previous checks).
        // Check Service (TipoContratista) and Dependencia
        const [servs] = await sequelize.query("SELECT id FROM tipos_contratista LIMIT 1");
        const [deps] = await sequelize.query("SELECT id FROM dependencias LIMIT 1");

        if (servs.length === 0 || deps.length === 0) {
            log += 'CRITICAL: No Services or Dependencies found. Cannot create assignment.\n';
        } else {
            const servId = servs[0].id;
            const depId = deps[0].id;
            const contId = 421; // From previous investigation

            log += `Creating assignment for Contratista ${contId}, Servicio ${servId}, Dependencia ${depId}...\n`;

            // 2. Create Assignment
            const [res] = await sequelize.query(`INSERT INTO contratista_asignaciones (contratista_id, servicio_id, dependencia_id, activo, created_at, updated_at) VALUES (${contId}, ${servId}, ${depId}, 1, NOW(), NOW())`);

            log += `Assignment Created (ID might be returned differently depending on dialect/driver): ${res}\n`;

            // Get the ID
            const [last] = await sequelize.query("SELECT id FROM contratista_asignaciones ORDER BY id DESC LIMIT 1");
            const newAsigId = last[0].id;
            log += `New Assignment ID: ${newAsigId}\n`;

            // 3. Fix Registry 16
            await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${newAsigId} WHERE id = 16`);
            log += `Registro 16 updated to Asig ${newAsigId}.\n`;

            // 4. Verify
            const [chk] = await sequelize.query("SELECT contratista_asignacion_id FROM registros WHERE id = 16");
            log += `Final Registry State: ${chk[0].contratista_asignacion_id}\n`;
        }

    } catch (e) {
        log += `Error: ${e.message}\n`;
    } finally {
        fs.writeFileSync('seed_fix_status.txt', log);
        await sequelize.close();
    }
})();
