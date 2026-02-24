/**
 * Script: Assign programa_id to TipoContratista (Servicios)
 * Maps services to programas based on name similarity.
 * Services that cannot be mapped are assigned to Programa 5 (Seguridad Industrial) as default.
 * Run: node scripts/assign_programa_to_servicios.js
 */
const { TipoContratista, Programa } = require('../src/database/models');

// Mapping: servicio_id -> programa_id (based on name similarity)
const mapping = {
    // Already assigned (1-5): skip
    // 6: MANTENIMIENTO -> 4 (OIM Mantenimiento Plantas)
    6: 4,
    // 7: INSTALACIONES/SERVICIO TÉCNICO -> 4
    7: 4,
    // 8: SOFTWARE Y SISTEMAS -> 4
    8: 4,
    // 9: DISTRIBUCIÓN ENVASADO -> 2 (OIM Envasado)
    9: 2,
    // 10: ASEO, CONTROL DE PLAGAS Y CASINO -> 5 (Seguridad Industrial)
    10: 5,
    // 11: DISTRIBUCIÓN GRANEL -> 1 (OIM Distribución Granel)
    11: 1,
    // 12: MOVILIZADO DE CILINDROS -> 2 (Envasado)
    12: 2,
    // 13: INSPECCIÓN -> 5
    13: 5,
    // 14: GUARDIAS -> 5
    14: 5,
    // 15: TRANSPORTE DEL PERSONAL -> 3 (OIM Transporte)
    15: 3,
    // 16: CALL CENTER -> 5
    16: 5,
    // 17: OBRAS CIVILES Y MONTAJE -> 4
    17: 4,
    // 18: REINSPECTORA -> 5
    18: 5,
    // 19: EMI -> 5
    19: 5,
    // 20: MANTENCIÓN DE ENVASES -> 2
    20: 2,
    // 21: MEDIO AMBIENTE -> 5
    21: 5,
    // 22: ABASTECIMIENTO -> 1
    22: 1,
    // 23: INSTALACIONES / SERVICIO TÉCNICO -> 4
    23: 4,
    // 24: BODEGA -> 2
    24: 2,
    // 25: OPERACIÓN -> 1
    25: 1,
    // 26: MEDIDORES -> 4
    26: 4,
    // 27: VENTAS TERRENO -> 5
    27: 5,
    // 28: SERVICIOS GENERALES -> 5
    28: 5,
    // 29: COMUNICACIONES -> 5
    29: 5,
};

(async () => {
    try {
        console.log('=== Assigning programa_id to Servicios ===\n');

        for (const [servicioId, programaId] of Object.entries(mapping)) {
            const servicio = await TipoContratista.findByPk(servicioId);
            if (!servicio) {
                console.log(`  SKIP: Servicio ${servicioId} not found`);
                continue;
            }
            if (servicio.programa_id) {
                console.log(`  SKIP: ${servicio.nombre} (id:${servicioId}) already has programa_id=${servicio.programa_id}`);
                continue;
            }
            await servicio.update({ programa_id: programaId });
            const prog = await Programa.findByPk(programaId);
            console.log(`  OK: ${servicio.nombre} (id:${servicioId}) -> ${prog.nombre} (prog:${programaId})`);
        }

        console.log('\n=== Done ===');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
