require('dotenv').config();
const { Contratista, Vinculacion, Dependencia, TipoContratista } = require('../database/models');

async function assignProgram() {
    try {
        // 1. Find Contractor
        const contratista = await Contratista.findOne({
            where: { nombre: 'TRANSPORTE DE CARGA POR CARRETERA TRANSCAR SPA' }
        });

        if (!contratista) {
            console.log('❌ Contractor not found.');
            return;
        }

        // 2. Find Service (Transporte)
        // Assuming ID 3 based on previous check, but let's look up by name to be safe
        const servicio = await TipoContratista.findOne({
            where: { nombre: 'Transporte' }
        });

        if (!servicio) {
            console.log('❌ Service "Transporte" not found.');
            return;
        }

        // 3. Find Dependency (Planta Mejillones)
        const dependencia = await Dependencia.findOne({
            where: { nombre: 'PLANTA MEJILLONES' }
        });

        if (!dependencia) {
            console.log('❌ Dependency "PLANTA MEJILLONES" not found. Using first available.');
            // Fallback?
            return;
        }

        // 4. Create Vinculacion
        const [vinculacion, created] = await Vinculacion.findOrCreate({
            where: {
                contratista_id: contratista.id,
                servicio_id: servicio.id,
                dependencia_id: dependencia.id
            },
            defaults: {
                activo: 1
            }
        });

        if (created) {
            console.log(`✅ Vinculacion created: Contractor ${contratista.nombre} assigned to Service ${servicio.nombre} at ${dependencia.nombre}.`);
        } else {
            console.log(`⚠️ Vinculacion already exists.`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

assignProgram();
