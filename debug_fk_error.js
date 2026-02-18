const sequelize = require('./back/src/database/index');
const Registro = require('./back/src/database/models/Registro');

async function debug() {
    try {
        const registroId = 12;
        const registro = await Registro.findByPk(registroId);

        if (registro) {
            console.log('Registro found:', JSON.stringify(registro, null, 2));

            const [asignacion] = await sequelize.query(`SELECT * FROM contratista_asignaciones WHERE id = ${registro.contratista_asignacion_id}`);
            console.log('Asignacion for id ' + registro.contratista_asignacion_id + ':', asignacion);

            const [vinculacion] = await sequelize.query(`SELECT * FROM vinculaciones WHERE id = ${registro.contratista_asignacion_id}`);
            console.log('Vinculacion for id ' + registro.contratista_asignacion_id + ':', vinculacion);

            const [allVinc] = await sequelize.query('SELECT id FROM vinculaciones LIMIT 10');
            console.log('Some existing vinculacion IDs:', allVinc.map(v => v.id));
        } else {
            console.log('Registro ' + registroId + ' not found');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

debug();
