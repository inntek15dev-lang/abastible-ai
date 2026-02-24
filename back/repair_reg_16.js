const { Registro, ContratistaAsignacion } = require('./src/database/models');
const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('Starting repair for Registro 16');
        const contractId = 421;
        let asig = await ContratistaAsignacion.findOne({ where: { contratista_id: contractId, activo: 1 } });

        if (!asig) {
            console.log('Creating new assignment for contractor', contractId);
            asig = await ContratistaAsignacion.create({
                contratista_id: contractId,
                servicio_id: 1,
                dependencia_id: 1,
                activo: 1
            });
            console.log('Created new assignment:', asig.id);
        } else {
            console.log('Found existing assignment:', asig.id);
        }

        const reg = await Registro.findByPk(16);
        if (reg) {
            console.log('Current Assignment ID:', reg.contratista_asignacion_id);
            reg.contratista_asignacion_id = asig.id;
            await reg.save();
            console.log('FIXED: Registro 16 now points to Assignment', asig.id);
        } else {
            console.log('Registro 16 not found');
        }
    } catch (e) {
        console.error('Error in repair script:', e);
    } finally {
        await sequelize.close(); // Close DB connection
    }
})();
