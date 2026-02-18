
const { Registro, RegistroActividad, Actividad, Elemento, sequelize } = require('./src/database/models');
const { Op } = require('sequelize');

async function testQuery() {
    try {
        console.log('Testing query...');

        // Find some existing registros to use as ID filter
        const registros = await Registro.findAll({ limit: 5 });
        const registroIds = registros.map(r => r.id);
        console.log('Using registro IDs:', registroIds);

        if (registroIds.length === 0) {
            console.log('No registros found.');
            return;
        }

        const elementosStats = await RegistroActividad.findAll({
            attributes: [
                [sequelize.col('actividad.elemento.id'), 'elemento_id'],
                [sequelize.col('actividad.elemento.nombre'), 'elemento_nombre'],
                [sequelize.fn('COUNT', sequelize.col('RegistroActividad.id')), 'total'],
                [sequelize.literal(`SUM(CASE WHEN cumple_auditor = 1 OR (cumple_auditor IS NULL AND cumple = 1) THEN 1 ELSE 0 END)`), 'cumplidas_count']
            ],
            include: [{
                model: Actividad,
                as: 'actividad',
                attributes: [],
                include: [{
                    model: Elemento,
                    as: 'elemento',
                    attributes: ['id', 'nombre']
                }]
            }],
            where: { registro_id: registroIds },
            group: ['actividad.elemento.id', 'actividad.elemento.nombre'],
            raw: true
        });

        console.log('Result:', JSON.stringify(elementosStats, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

testQuery();
