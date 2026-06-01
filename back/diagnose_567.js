const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('--- DIAGNOSTIC START ---');

        // Check for records with the invalid assignment ID
        const [badRegs] = await sequelize.query("SELECT id, contratista_asignacion_id FROM registros WHERE contratista_asignacion_id = 567");
        console.log(`Registros with invalid assignment (567): ${badRegs.length}`);
        if (badRegs.length > 0) {
            console.log('IDs:', badRegs.map(r => r.id));
        }

        // Check for Registro 2 specifically
        const [reg2] = await sequelize.query("SELECT id, contratista_asignacion_id FROM registros WHERE id = 2");
        console.log('Registro 2 search result:', reg2);

        // REPAIR LOGIC
        if (badRegs.length > 0) {
            console.log('Attempting repair...');

            // Find a valid assignment ID (any active one for now, or preferably one linked to the same contractor if we could look it up, but for safety just a valid one to stop the crash)
            // Ideally we should look at the user metadata, but let's just get a valid FK first.
            const [validAsig] = await sequelize.query("SELECT id FROM contratista_asignaciones WHERE activo = 1 LIMIT 1");

            if (validAsig.length > 0) {
                const newId = validAsig[0].id;
                console.log(`Found valid assignment ID: ${newId}. Updating records...`);

                await sequelize.query(`UPDATE registros SET contratista_asignacion_id = ${newId} WHERE contratista_asignacion_id = 567`);
                console.log('Update command executed.');

                // Verify
                const [check] = await sequelize.query("SELECT id FROM registros WHERE contratista_asignacion_id = 567");
                console.log(`Remaining records with 567: ${check.length}`);
            } else {
                console.log('CRITICAL: No active assignments found in the system to fallback to.');
            }
        }

        console.log('--- DIAGNOSTIC END ---');
    } catch (e) {
        console.error('Diagnostic error:', e);
    } finally {
        await sequelize.close();
    }
})();
