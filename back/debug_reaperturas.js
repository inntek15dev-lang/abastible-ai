const { SolicitudReapertura, Registro, User } = require('./src/database/models');

async function debugReaperturas() {
    try {
        console.log('--- Debugging SolicitudReapertura ---');
        const count = await SolicitudReapertura.count();
        console.log(`Total solicitudes: ${count}`);

        const solicitudes = await SolicitudReapertura.findAll({
            include: [
                { model: Registro, as: 'registro', attributes: ['id', 'periodo'] },
                { model: User, as: 'solicitante', attributes: ['id', 'name'] }
            ]
        });

        console.log(JSON.stringify(solicitudes, null, 2));

    } catch (err) {
        console.error('Error:', err);
    }
}

debugReaperturas();
