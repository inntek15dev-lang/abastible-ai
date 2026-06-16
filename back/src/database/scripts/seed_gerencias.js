// IEEE Trace: SPRINT 1 | Seeders | Gerencias y Subgerencias
const { Gerencia, Subgerencia, Dependencia } = require('../../models');

async function seedGerencias() {
    console.log('--- Iniciando Seeder de Gerencias y Subgerencias ---');
    try {
        // 1. Crear Gerencia Central de Prueba
        const [gerencia] = await Gerencia.findOrCreate({
            where: { nombre: 'Gerencia Operaciones' },
            defaults: { activo: 1 }
        });
        console.log(`✅ Gerencia asegurada: ${gerencia.nombre} (ID: ${gerencia.id})`);

        // 2. Crear Subgerencia de Prueba
        const [subgerencia] = await Subgerencia.findOrCreate({
            where: { nombre: 'Subgerencia Mantenimiento', gerencia_id: gerencia.id },
            defaults: { activo: 1 }
        });
        console.log(`✅ Subgerencia asegurada: ${subgerencia.nombre} (ID: ${subgerencia.id})`);

        // 3. Vincular Dependencias Huérfanas (Opcional pero recomendado para testeo)
        const count = await Dependencia.update(
            { subgerencia_id: subgerencia.id },
            { where: { subgerencia_id: null } }
        );
        console.log(`✅ Se actualizaron ${count[0]} dependencias previas asignándoles la subgerencia base.`);

        console.log('--- Seeder de Gerencias finalizado con éxito ---');
    } catch (error) {
        console.error('❌ Error ejecutando el seeder de Gerencias:', error);
    }
}

// Permitir ejecución directa
if (require.main === module) {
    seedGerencias().then(() => process.exit(0));
}

module.exports = seedGerencias;
