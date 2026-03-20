const { sequelize, Registro, RegistroLog, Compromiso } = require('../src/database/models');

async function enhance() {
    console.log('🚀 Enhancing Granel Data with Traceability and Commitments...');
    const t = await sequelize.transaction();
    try {
        const creator_id = 4;
        const auditor_id = 2;

        const regs = await Registro.findAll({
            where: { contratista_asignacion_id: 1 },
            order: [['periodo', 'ASC']]
        });

        for (const r of regs) {
            console.log(`  🔧 Processing Record ID: ${r.id} (${r.periodo}) - ${r.estado_auditoria}`);

            // 1. Traceability Logs
            const logs = [];
            
            // Common for all: Creation
            logs.push({
                registro_id: r.id,
                user_id: creator_id,
                accion: 'CREACION',
                descripcion: 'Registro mensual iniciado por el contratista.',
                created_at: new Date(r.created_at || new Date(r.periodo))
            });

            if (r.estado_auditoria !== 'borrador' && r.estado_auditoria !== 'pendiente') {
                // Envío
                logs.push({
                    registro_id: r.id,
                    user_id: creator_id,
                    accion: 'ENVIO',
                    descripcion: 'Registro enviado para auditoría.',
                    created_at: new Date(new Date(r.periodo).getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days later
                });

                if (['auditada', 'finalizado', 'subsanado'].includes(r.estado_auditoria)) {
                    // Auditoría Iniciada
                    logs.push({
                        registro_id: r.id,
                        user_id: auditor_id,
                        accion: 'INICIO_AUDITORIA',
                        descripcion: 'El administrador de contrato ha iniciado la revisión.',
                        created_at: new Date(new Date(r.periodo).getTime() + 7 * 24 * 60 * 60 * 1000)
                    });
                }

                if (r.estado_auditoria === 'subsanado') {
                    // Observaciones
                    logs.push({
                        registro_id: r.id,
                        user_id: auditor_id,
                        accion: 'OBSERVACION',
                        descripcion: 'Se detectaron incumplimientos menores. Se requiere subsanación.',
                        created_at: new Date(new Date(r.periodo).getTime() + 10 * 24 * 60 * 60 * 1000)
                    });
                    // Subsanación
                    logs.push({
                        registro_id: r.id,
                        user_id: creator_id,
                        accion: 'SUBSANACION',
                        descripcion: 'Evidencias corregidas y cargadas.',
                        created_at: new Date(new Date(r.periodo).getTime() + 15 * 24 * 60 * 60 * 1000)
                    });
                }

                if (r.estado_auditoria === 'finalizado') {
                    // Cierre
                    logs.push({
                        registro_id: r.id,
                        user_id: auditor_id,
                        accion: 'CIERRE_AUDITORIA',
                        descripcion: 'Registro auditado y aprobado satisfactoriamente.',
                        created_at: new Date(new Date(r.periodo).getTime() + 12 * 24 * 60 * 60 * 1000)
                    });
                }
            }

            await RegistroLog.bulkCreate(logs, { transaction: t });

            // 2. Commitments (Compromisos)
            if (r.id === 8) { // Jan 2026 - Subsanado
                await Compromiso.create({
                    registro_id: r.id,
                    responsable_id: creator_id,
                    creado_por_id: auditor_id,
                    descripcion: 'Renovar licencias de conducir vencidas detectadas en auditoría.',
                    fecha_compromiso: '2026-02-15',
                    estado: 'pendiente'
                }, { transaction: t });

                await Compromiso.create({
                    registro_id: r.id,
                    responsable_id: creator_id,
                    creado_por_id: auditor_id,
                    descripcion: 'Actualizar certificados de mantención de vehículos.',
                    fecha_compromiso: '2026-02-10',
                    estado: 'en_proceso'
                }, { transaction: t });
            }

            if (r.id === 5) { // Oct 2025 - Finalizado
                await Compromiso.create({
                    registro_id: r.id,
                    responsable_id: creator_id,
                    creado_por_id: auditor_id,
                    descripcion: 'Capacitación en seguridad vial para nuevos conductores.',
                    fecha_compromiso: '2025-11-15',
                    estado: 'cumplido',
                    fecha_cumplimiento: '2025-11-12',
                    observacion_cumplimiento: 'Capacitación realizada presencialmente en Planta.'
                }, { transaction: t });
            }

            if (r.id === 9) { // Feb 2026 - Pendiente
                await Compromiso.create({
                    registro_id: r.id,
                    responsable_id: creator_id,
                    creado_por_id: auditor_id,
                    descripcion: 'Entrega de nuevos EPP (Zapatos de seguridad y Cascos).',
                    fecha_compromiso: '2026-03-25',
                    estado: 'en_proceso'
                }, { transaction: t });
            }
        }

        await t.commit();
        console.log('✅ Enhancement completed successfully.');
    } catch (error) {
        await t.rollback();
        console.error('❌ Error enhancing data:', error);
    } finally {
        await sequelize.close();
    }
}

enhance();
