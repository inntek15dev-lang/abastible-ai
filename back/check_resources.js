const { TipoContratista, Dependencia } = require('./src/database/models');

async function check() {
    try {
        const servicios = await TipoContratista.findAll();
        const dependencias = await Dependencia.findAll();
        console.log('--- SERVICIOS ---');
        servicios.forEach(s => console.log(`${s.id}: ${s.nombre}`));
        console.log('--- DEPENDENCIAS ---');
        dependencias.forEach(d => console.log(`${d.id}: ${d.nombre}`));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

check();
