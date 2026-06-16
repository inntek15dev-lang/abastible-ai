const { sequelize, Registro, RegistroActividad, Actividad, Elemento } = require('../src/database/models');

async function seed() {
    console.log('🚀 Starting Granel Data Seeding for Osorno/Mafran...');
    const t = await sequelize.transaction();
    try {
        // IDs identified previously
        const vinculacion_id = 1;
        const programa_id = 2;
        const creator_id = 4; // Contratista Movilizado
        const auditor_id = 2; // Administrador de Contratos
        const dependencia_id = 2; // PLANTA OSORNO
        const eecc_nombre = 'SOC DE TRANSPORTE MAFRAN LTDA';
        const dependencia_nombre = 'PLANTA OSORNO';

        // Fetch activities for the program
        const activities = await Actividad.findAll({
            include: [{
                model: Elemento,
                as: 'elemento',
                where: { programa_id: programa_id }
            }]
        });

        if (activities.length === 0) {
            throw new Error('No activities found for program ID 2');
        }

        const data = [
            { period: '2025-10-01', estado: 'finalizado', avance: 100, personas: 15, dotacion: 20 },
            { period: '2025-11-01', estado: 'finalizado', avance: 100, personas: 16, dotacion: 20 },
            { period: '2025-12-01', estado: 'auditada', avance: 100, personas: 14, dotacion: 18 },
            { period: '2026-01-01', estado: 'subsanado', avance: 80, personas: 15, dotacion: 19 },
            { period: '2026-02-01', estado: 'pendiente', avance: 50, personas: 12, dotacion: 15 },
            { period: '2026-03-01', estado: 'borrador', avance: 10, personas: 10, dotacion: 12 }
        ];

        for (const item of data) {
            console.log(`  📝 Creating record for ${item.period} (${item.estado})...`);
            
            // Note: Map 'finalizado' to 'finalizado' for estado_auditoria
            // Some states in the model ENUM: 'pendiente', 'auditando', 'auditada', 'reabierto', 'subsanado', 'reapertura_pendiente', 'en_revision', 'finalizado'
            
            const registro = await Registro.create({
                user_id: creator_id,
                contratista_asignacion_id: vinculacion_id,
                programa_id: programa_id,
                dependencia_id: dependencia_id,
                periodo: item.period,
                eecc_nombre: eecc_nombre,
                dependencia: dependencia_nombre,
                personas_nuevas: Math.floor(item.personas / 4),
                supervisores: 2,
                prevencionistas: 1,
                dotacion_total: item.dotacion,
                porcentaje_cumplimiento: item.avance,
                porcentaje_cumplimiento_auditor: item.estado === 'finalizado' ? item.avance : null,
                auditado: item.estado === 'finalizado' ? 1 : 0,
                cerrado: item.estado === 'finalizado' ? 1 : 0,
                estado_auditoria: item.estado === 'borrador' ? 'pendiente' : item.estado,
                auditado_por: (item.estado === 'finalizado' || item.estado === 'auditada') ? auditor_id : null,
                fecha_auditoria: (item.estado === 'finalizado' || item.estado === 'auditada') ? new Date() : null
            }, { transaction: t });

            // Create activities
            const regActs = activities.map(act => ({
                registro_id: registro.id,
                actividad_id: act.id,
                cumple: item.avance > 50 ? 1 : (Math.random() > 0.3 ? 1 : 0),
                observacion: item.avance < 100 && Math.random() > 0.7 ? 'Observación de prueba' : null,
                no_aplica: 0
            }));

            await RegistroActividad.bulkCreate(regActs, { transaction: t });
        }

        await t.commit();
        console.log('✅ Seeding completed successfully.');
    } catch (error) {
        await t.rollback();
        console.error('❌ Error seeding data:', error);
    } finally {
        await sequelize.close();
    }
}

seed();
