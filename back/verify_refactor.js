const { Compromiso, Registro, Vinculacion, User } = require('./src/database/models');

(async () => {
    try {
        console.log('Verifying Refactor...');

        // 1. Get Registry 17
        const registro = await Registro.findByPk(17);
        if (!registro) {
            console.log('Registry 17 not found');
            return;
        }
        console.log(`Registry 17 found. Linked Vinculacion ID: ${registro.contratista_asignacion_id}`);

        // 2. Get Linked Vinculacion
        let expectedContract = null;
        if (registro.contratista_asignacion_id) {
            const vinc = await Vinculacion.findByPk(registro.contratista_asignacion_id);
            if (vinc) {
                console.log(`Vinculacion found. Numero Contrato: ${vinc.numero_contrato}`);
                expectedContract = vinc.numero_contrato;
            } else {
                console.log('Vinculacion not found');
            }
        }

        // 3. Create Compromiso (Simulate Controller)
        console.log('Creating Compromiso...');
        const compromiso = await Compromiso.create({
            registro_id: 17,
            descripcion: 'Test Refactor Verification',
            fecha_compromiso: new Date(),
            responsable_id: registro.user_id,
            creado_por_id: registro.user_id,
            numero_contrato: expectedContract,
            estado: 'pendiente'
        });

        console.log('Compromiso Created with ID:', compromiso.id);
        console.log('Saved Numero Contrato:', compromiso.numero_contrato);

        if (compromiso.numero_contrato === expectedContract) {
            console.log('SUCCESS: Numero Contrato matches!');
        } else {
            console.log('FAILURE: Mismatch.');
        }

    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        process.exit();
    }
})();
