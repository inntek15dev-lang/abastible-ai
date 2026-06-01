const { Registro, ContratistaAsignacion } = require('./src/database/models');
const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('--- MODEL FIX 567 START ---');

        // Find valid assignment
        const asig = await ContratistaAsignacion.findOne({ where: { activo: 1 } });
        if (!asig) { console.error('No active assignment!'); process.exit(1); }
        console.log('Target ID:', asig.id);

        // Find bad records
        const badRegs = await Registro.findAll({ where: { contratista_asignacion_id: 567 } });
        console.log('Bad Regs Count:', badRegs.length);

        for (const reg of badRegs) {
            console.log(`Fixing Reg ${reg.id}...`);
            reg.contratista_asignacion_id = asig.id;
            await reg.save();
            console.log(`Reg ${reg.id} saved.`);
        }

        // Verify
        const check = await Registro.count({ where: { contratista_asignacion_id: 567 } });
        console.log('Remaining:', check);

    } catch (e) { console.error(e); } finally { await sequelize.close(); }
})();
