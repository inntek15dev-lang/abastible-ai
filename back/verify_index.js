const { Compromiso, Hallazgo, User } = require('./src/database/models');

(async () => {
    try {
        console.log('Verifying Compromiso Index Query...');

        const compromisos = await Compromiso.findAll({
            include: [
                { model: Hallazgo, as: 'hallazgo', attributes: ['id', 'descripcion', 'tipo'] },
                { model: User, as: 'responsable', attributes: ['id', 'name'] },
                { model: User, as: 'creadoPor', attributes: ['id', 'name'] }
            ],
            limit: 5
        });

        console.log(`SUCCESS: Retrieved ${compromisos.length} compromisos.`);
        if (compromisos.length > 0) {
            console.log('Sample ID:', compromisos[0].id);
        }

    } catch (e) {
        console.error('FAILURE:', e.message);
        if (e.original) console.error('SQL Error:', e.original.sqlMessage);
    } finally {
        process.exit();
    }
})();
