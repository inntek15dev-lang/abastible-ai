// IEEE Trace: All Entities | seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
    sequelize,
    Role,
    Privilegio,
    Dependencia,
    Programa,
    Configuracion,
    TipoContratista,
    Elemento,
    Actividad,
    User,
    ContratistaAsignacion,
    Contratista,
    Vinculacion,
    Administracion
} = require('./database/models');

async function seed() {
    try {
        console.log('🔄 Sincronizando base de datos...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await sequelize.sync({ force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        // ============= ORDER 0: Base tables =============
        console.log('📦 Creando roles...');
        const roles = await Role.bulkCreate([
            { name: 'admin', guard_name: 'web' },
            { name: 'administrador_contrato', guard_name: 'web' },
            { name: 'contratista_admin', guard_name: 'web' },
            { name: 'contratista_user', guard_name: 'web' }
        ]);

        console.log('📦 Creando configuraciones...');
        await Configuracion.bulkCreate([
            { clave: 'meta_programa', valor: '85', descripcion: 'Meta de cumplimiento del programa OIEM (%)', tipo: 'text' },
            { clave: 'fecha_limite_reporte', valor: '5', descripcion: 'Día hábil límite para reporte', tipo: 'number' },
            { clave: 'dias_cierre_hallazgo', valor: '30', descripcion: 'Días máximos para cierre de hallazgos', tipo: 'number' },
            { clave: 'evidencia_obligatoria', valor: '1', descripcion: 'Evidencia obligatoria para todas las actividades', tipo: 'boolean' },
            { clave: 'max_evidencias_por_actividad', valor: '4', descripcion: 'Máximo de evidencias por actividad', tipo: 'integer' }
        ]);

        console.log('📦 Creando dependencias...');
        const dependenciasData = [
            { nombre: 'OFICINA CHILLAN', activo: 1 },
            { nombre: 'OFICINA DISTRIBUCIÓN LENGA', activo: 1 },
            { nombre: 'OFICINA TEMUCO', activo: 1 },
            { nombre: 'OFICINA VILLARRICA', activo: 1 },
            { nombre: 'OFICINA DISTRIBUCIÓN MAIPÚ', activo: 1 },
            { nombre: 'OFICINA DISTRIBUCIÓN OSORNO', activo: 1 },
            { nombre: 'PLANTA COYAHIQUE', activo: 1 },
            { nombre: 'OFICINA LOS ANGELES', activo: 1 },
            { nombre: 'PLANTA LENGA', activo: 1 },
            { nombre: 'PLANTA OSORNO', activo: 1 }
        ];
        const dependencias = await Dependencia.bulkCreate(dependenciasData);
        // Index map for easy reference:
        // 0: OFICINA CHILLAN
        // 1: OFICINA DISTRIBUCIÓN LENGA
        // 2: OFICINA TEMUCO
        // 3: OFICINA VILLARRICA
        // 4: OFICINA DISTRIBUCIÓN MAIPÚ
        // 5: OFICINA DISTRIBUCIÓN OSORNO
        // 6: PLANTA COYAHIQUE
        // 7: OFICINA LOS ANGELES
        // 8: PLANTA LENGA
        // 9: PLANTA OSORNO

        console.log('📦 Creando programas...');
        const programasData = [
            { nombre: 'OIM Distribución Envasado', descripcion: 'Programa HSE y Operacional Distribución Envasado', activo: 1 },
            { nombre: 'OIM Distribución Granel', descripcion: 'Programa HSE y Operacional Distribución Granel', activo: 1 }
        ];
        const programas = await Programa.bulkCreate(programasData);
        // 0: Envasado, 1: Granel

        // ============= ORDER 1: Tables with FK to order 0 =============
        console.log('📦 Creando tipos de contratista (servicios)...');
        const tiposContratistaData = [
            { nombre: 'Distribución Envasado', descripcion: 'Contratista de distribución envasado', programa_id: programas[0].id, activo: 1 },
            { nombre: 'Distribución Granel', descripcion: 'Contratista de distribución granel', programa_id: programas[1].id, activo: 1 }
        ];
        const tiposContratista = await TipoContratista.bulkCreate(tiposContratistaData);
        // 0: Distribución Envasado, 1: Distribución Granel

        console.log('📦 Creando elementos y actividades de OIM Distribución Granel...');
        const allActividades = [];
        const granelData = require('./data/granel');

        let ordElm = 1;
        for (const data of granelData) {
            const elemento = await Elemento.create({
                programa_id: programas[1].id,
                numero: data.numero,
                nombre: data.nombre,
                descripcion: `Elemento ${data.numero}: ${data.nombre}`,
                orden: ordElm++
            });

            let ordAct = 1;
            for (const act of data.actividades) {
                const actividad = await Actividad.create({
                    elemento_id: elemento.id,
                    codigo: act.codigo,
                    actividad: `${act.codigo} - ${data.nombre}`,
                    descripcion: act.descripcion,
                    criterios: act.criterios,
                    frecuencia: act.frecuencia,
                    requiere_evidencia: act.requiere_evidencia,
                    orden: ordAct++,
                    activo: 1
                });
                allActividades.push(actividad);
            }
        }

        console.log('📦 Creando privilegios...');
        await Privilegio.bulkCreate([
            { role_id: roles[0].id, ref_modulo: '*', read: 1, write: 1, excec: 1 },
            { role_id: roles[0].id, ref_modulo: 'Auditoria', read: 1, write: 1, excec: 1 },
            { role_id: roles[0].id, ref_modulo: 'Reportes', read: 1, write: 1, excec: 1 },
            { role_id: roles[0].id, ref_modulo: 'Registros_Exportar', read: 1, write: 1, excec: 1 }
        ]);

        const adminContratoModules = ['Dashboard', 'Registros', 'Contratistas', 'Reaperturas', 'Compromisos', 'Auditoria', 'Reportes', 'Registros_Exportar'];
        for (const mod of adminContratoModules) {
            await Privilegio.create({ role_id: roles[1].id, ref_modulo: mod, read: 1, write: ['Registros'].includes(mod) ? 0 : 1, excec: ['Reaperturas'].includes(mod) ? 1 : 0 });
        }

        const contratistaAdminModules = ['Dashboard', 'Registros', 'Evidencias', 'Reaperturas', 'Usuarios', 'Compromisos', 'Reportes', 'Registros_Exportar'];
        for (const mod of contratistaAdminModules) {
            await Privilegio.create({ role_id: roles[2].id, ref_modulo: mod, read: 1, write: ['Registros', 'Evidencias', 'Usuarios'].includes(mod) ? 1 : 0, excec: mod === 'Reaperturas' ? 1 : 0 });
        }

        const contratistaUserModules = ['Dashboard', 'Registros', 'Evidencias', 'Registros_Exportar'];
        for (const mod of contratistaUserModules) {
            await Privilegio.create({ role_id: roles[3].id, ref_modulo: mod, read: 1, write: ['Registros', 'Evidencias'].includes(mod) ? 1 : 0, excec: 0 });
        }

        // ============= ORDER 2: Empresa Contratista =============
        console.log('📦 Creando empresa contratista...');
        const mafran = await Contratista.create({
            rut: '76169976-8',
            nombre: 'SOC DE TRANSPORTE MAFRAN LTDA',
            activo: 1
        });

        // ============= ORDER 3: Vinculaciones de MAFRAN =============
        console.log('📦 Creando vinculaciones de MAFRAN...');
        const vinculacionesData = [
            // DISTRIBUCIÓN ENVASADO
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[0].id, numero_contrato: '265', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[1].id, numero_contrato: '277', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[2].id, numero_contrato: '297', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[3].id, numero_contrato: '303', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[4].id, numero_contrato: '1207', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[5].id, numero_contrato: '1208', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[6].id, numero_contrato: '1248', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[7].id, numero_contrato: '1320', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            // DISTRIBUCIÓN GRANEL
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[7].id, numero_contrato: '1397', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[8].id, numero_contrato: '1399', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[3].id, numero_contrato: '1400', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[9].id, numero_contrato: '1401', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 }
        ];
        const vinculaciones = await Vinculacion.bulkCreate(vinculacionesData);

        // ============= ORDER 4: Usuarios =============
        console.log('📦 Creando usuarios...');
        const hashedPassword = await bcrypt.hash('User123*', 10);

        // 1. Admin OIEM (admin)
        const adminOiem = await User.create({
            name: 'Administrador OIEM',
            email: 'admin@abastible.cl',
            password: hashedPassword,
            role: 'admin',
            activo: 1
        });

        // 2. Administrador de Contratos (administrador_contrato)
        const adminContrato = await User.create({
            name: 'Administrador de Contratos',
            email: 'administrador.contrato@abastible.cl',
            password: hashedPassword,
            role: 'administrador_contrato',
            activo: 1
        });

        // 3. Contratista Administrador (contratista_admin) → asignado a MAFRAN
        const contratistaAdmin = await User.create({
            name: 'Contratista Administrador',
            email: 'contratista.admin@demo.cl',
            password: hashedPassword,
            role: 'contratista_admin',
            contratista_id: mafran.id,
            activo: 1
        });

        // 4. Contratista Usuario (contratista_user) → asignado a MAFRAN, vinculación DISTRIBUCIÓN GRANEL / PLANTA OSORNO
        const contratistaUser = await User.create({
            name: 'Contratista Usuario',
            email: 'contratista.usuario@demo.cl',
            password: hashedPassword,
            role: 'contratista_user',
            contratista_id: mafran.id,
            tipo_contratista_id: tiposContratista[1].id, // Distribución Granel
            dependencia_id: dependencias[9].id,          // PLANTA OSORNO
            parent_id: contratistaAdmin.id,
            activo: 1
        });

        // ============= ORDER 5: Asignación de contratista (legacy + vinculación) =============
        console.log('📦 Creando asignación de contratista...');
        await ContratistaAsignacion.create({
            user_id: contratistaAdmin.id,
            tipo_contratista_id: tiposContratista[1].id, // Distribución Granel
            dependencia_id: dependencias[9].id,          // PLANTA OSORNO
            administrador_contrato_id: adminContrato.id,
            periodo_inicio: new Date('2026-02-01')
        });

        // ============= ORDER 6: Administración (ADC → Vinculación) =============
        console.log('📦 Creando administración de contrato...');
        // vinculaciones[11] = DISTRIBUCIÓN GRANEL / PLANTA OSORNO (contrato 1401)
        await Administracion.create({
            vinculacion_id: vinculaciones[11].id,
            administrador_contrato_id: adminContrato.id,
            activo: 1
        });

        console.log('');
        console.log('✅ Seed base completado exitosamente!');
        console.log('📋 Credenciales: admin@abastible.cl / User123*');
        console.log('📋 EECC: SOC DE TRANSPORTE MAFRAN LTDA (76169976-8) con 12 vinculaciones');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
