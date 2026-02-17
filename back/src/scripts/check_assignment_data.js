require('dotenv').config();
const { Contratista, Programa, TipoContratista } = require('../database/models');

async function checkData() {
    try {
        // Find Contractor
        const contratista = await Contratista.findOne({
            where: { nombre: 'TRANSPORTE DE CARGA POR CARRETERA TRANSCAR SPA' }
        });

        if (contratista) {
            console.log(`\n✅ Found Contractor: ${contratista.nombre} (ID: ${contratista.id}, RUT: ${contratista.rut})`);
        } else {
            console.log('\n❌ Contractor "TRANSPORTE DE CARGA POR CARRETERA TRANSCAR SPA" not found.');
        }

        // List Programs and Services
        const programas = await Programa.findAll({
            include: [{ model: TipoContratista, as: 'tiposContratista' }]
        });

        console.log('\nAvailable Programs and Services:');
        programas.forEach(p => {
            console.log(`\nPrograma: ${p.nombre} (ID: ${p.id})`);
            if (p.tiposContratista.length > 0) {
                p.tiposContratista.forEach(s => {
                    console.log(`  - Service: ${s.nombre} (ID: ${s.id})`);
                });
            } else {
                console.log('  - No services linked.');
            }
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
