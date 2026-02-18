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
    Registro,
    RegistroActividad,
    Hallazgo,
    Compromiso,
    SolicitudReapertura
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

        console.log('📦 Creando dependencias (5+)...');
        const dependenciasData = [
            { nombre: 'Planta Mejillones', activo: 1 },
            { nombre: 'Región del BioBio', activo: 1 },
            { nombre: 'Santiago Maipú', activo: 1 },
            { nombre: 'Planta Concón', activo: 1 },
            { nombre: 'Planta Lirquén', activo: 1 },
            { nombre: 'Planta Coquimbo', activo: 1 }
        ];
        const dependencias = await Dependencia.bulkCreate(dependenciasData);

        console.log('📦 Creando programas (5)...');
        const programasData = [
            { nombre: 'OIM Distribución Granel', descripcion: 'Programa Granel', activo: 1 },
            { nombre: 'OIM Envasado', descripcion: 'Programa Envasado', activo: 1 },
            { nombre: 'OIM Transporte', descripcion: 'Programa Transporte', activo: 1 },
            { nombre: 'OIM Mantenimiento Plantas', descripcion: 'Programa Mantención', activo: 1 },
            { nombre: 'OIM Seguridad Industrial', descripcion: 'Programa HSE', activo: 1 }
        ];
        const programas = await Programa.bulkCreate(programasData);

        // ============= ORDER 1: Tables with FK to order 0 =============
        console.log('📦 Creando tipos de contratista...');
        const tiposContratistaData = [
            { nombre: 'Granel', descripcion: 'Contratistas de distribución granel', programa_id: programas[0].id, activo: 1 },
            { nombre: 'Envasado', descripcion: 'Contratistas de envasado', programa_id: programas[1].id, activo: 1 },
            { nombre: 'Transporte', descripcion: 'Fleteros', programa_id: programas[2].id, activo: 1 },
            { nombre: 'Mantención', descripcion: 'Servicios de mantención', programa_id: programas[3].id, activo: 1 },
            { nombre: 'Seguridad', descripcion: 'Servicios HSE', programa_id: programas[4].id, activo: 1 }
        ];
        const tiposContratista = await TipoContratista.bulkCreate(tiposContratistaData);

        console.log('📦 Creando elementos y actividades (Iterativo)...');
        const allActividades = [];

        // Generate Elements and Activities for EACH program to ensure coverage
        for (const prog of programas) {
            for (let i = 1; i <= 5; i++) {
                const elemento = await Elemento.create({
                    programa_id: prog.id,
                    numero: `${i}`,
                    nombre: `Elemento ${i} - ${prog.nombre.split(' ')[1]}`,
                    descripcion: `Descripción elemento ${i}`,
                    orden: i
                });

                // Create 2-3 activities per element
                for (let j = 1; j <= 2; j++) {
                    const actividad = await Actividad.create({
                        elemento_id: elemento.id,
                        codigo: `${i}.${j}`,
                        actividad: `Actividad ${i}.${j} de ${prog.nombre}`,
                        descripcion: `Descripción detallada de la actividad ${i}.${j}`,
                        criterios: 'Criterio de aceptación estándar OIEM',
                        frecuencia: j % 2 === 0 ? 'mensual' : 'semestral',
                        requiere_evidencia: 1,
                        orden: j,
                        activo: 1
                    });
                    if (prog.id === programas[0].id) {
                        allActividades.push(actividad); // Keep track for the main test scenario
                    }
                }
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

        console.log('📦 Creando usuarios (Standard + Extra)...');
        const hashedPassword = await bcrypt.hash('User123*', 10);

        const usersData = [
            { name: 'Administrador OIEM', email: 'admin@abastible.cl', role: 'admin', active: 1 },
            { name: 'Pedro Administrador', email: 'pedro.ac@abastible.cl', role: 'administrador_contrato', active: 1 },
            { name: 'Juan Administrador', email: 'juan.ac@abastible.cl', role: 'administrador_contrato', active: 1 },
            { name: 'María Contratista', email: 'contratista@demo.cl', role: 'contratista_admin', rut: '76.123.456-7', nombre_eecc: 'Transportes Demo SpA', typeId: 0, depId: 0 },
            { name: 'Carlos Operativo', email: 'operativo@demo.cl', role: 'contratista_user', parentEmail: 'contratista@demo.cl', typeId: 0, depId: 0 },
            { name: 'Ana Auditora', email: 'ana.auditora@abastible.cl', role: 'administrador_contrato', active: 1 },
            { name: 'Roberto Contratista', email: 'roberto@demo2.cl', role: 'contratista_admin', rut: '77.777.777-7', nombre_eecc: 'Servicios Gas SpA', typeId: 1, depId: 1 }
        ];

        const createdUsers = {};
        for (const u of usersData) {
            const userParams = {
                name: u.name,
                email: u.email,
                password: hashedPassword,
                role: u.role,
                activo: 1
            };
            if (u.rut) userParams.rut = u.rut;
            if (u.nombre_eecc) userParams.eecc_nombre = u.nombre_eecc;
            if (u.typeId !== undefined) userParams.tipo_contratista_id = tiposContratista[u.typeId].id;
            if (u.depId !== undefined) userParams.dependencia_id = dependencias[u.depId].id;

            const user = await User.create(userParams);
            createdUsers[u.email] = user;

            if (u.parentEmail && createdUsers[u.parentEmail]) {
                user.parent_id = createdUsers[u.parentEmail].id;
                await user.save();
            }
        }

        // Asignaciones
        const asignacion1 = await ContratistaAsignacion.create({
            user_id: createdUsers['contratista@demo.cl'].id,
            tipo_contratista_id: tiposContratista[0].id,
            dependencia_id: dependencias[0].id,
            administrador_contrato_id: createdUsers['pedro.ac@abastible.cl'].id,
            periodo_inicio: new Date()
        });

        // ============= ORDER 4: Test Scenarios (Registros) =============
        console.log('🚀 Generando Escenarios de Prueba (Registros)...');

        // We will create registers for the first Contratista to show different states
        const contratistaAsignacionID = asignacion1.id;
        const currentYear = 2026;

        const scenarios = [
            { month: 0, state: 'pendiente', desc: 'Enero: Pendiente' },
            { month: 1, state: 'en_proceso', desc: 'Febrero: En Proceso (algunas respuestas)' },
            { month: 2, state: 'enviado', desc: 'Marzo: Enviado a Auditoría' },
            { month: 3, state: 'auditado', desc: 'Abril: Auditado con Hallazgos' },
            { month: 4, state: 'cerrado', desc: 'Mayo: Cerrado impecable' }
        ];

        for (const scen of scenarios) {
            const periodo = new Date(currentYear, scen.month, 1);

            // 1. Create Registro
            const registro = await Registro.create({
                user_id: createdUsers['contratista@demo.cl'].id,
                contratista_asignacion_id: contratistaAsignacionID,
                periodo: periodo,
                estado_auditoria: ['pendiente', 'en_proceso', 'enviado'].includes(scen.state) ? 'pendiente' : 'auditada_sistema',
                porcentaje_cumplimiento: scen.state === 'cerrado' ? 100 :
                    scen.state === 'auditado' ? 75 : 0,
                auditado: ['auditado', 'cerrado'].includes(scen.state) ? 1 : 0,
                cerrado: scen.state === 'cerrado' ? 1 : 0,
                auditado_por: ['auditado', 'cerrado'].includes(scen.state) ? createdUsers['pedro.ac@abastible.cl'].id : null,
                fecha_auditoria: ['auditado', 'cerrado'].includes(scen.state) ? new Date() : null
            });

            // 2. Populate Activities (RegistroActividad)
            // Only if not strictly 'pendiente' empty
            if (scen.state !== 'pendiente') {
                for (const act of allActividades) {
                    const respuesta = Math.random() > 0.5 ? 'cumple' : 'no_cumple';
                    const regAct = await RegistroActividad.create({
                        registro_id: registro.id,
                        actividad_id: act.id,
                        respuesta_contratista: respuesta,
                        respuesta_auditor: ['auditado', 'cerrado'].includes(scen.state) ? respuesta : null
                    });

                    // 3. Add Evidence if 'En Proceso' or later
                    // (Simulated Logic)

                    // 4. Add Hallazgos if 'Auditado' and 'no_cumple'
                    if (scen.state === 'auditado' && respuesta === 'no_cumple') {
                        await Hallazgo.create({
                            registro_id: registro.id,
                            registro_actividad_id: regAct.id,
                            descripcion: 'Evidencia insuficiente o no corresponde al periodo',
                            tipo: 'no_conformidad',
                            estado: 'abierto',
                            auditor_id: createdUsers['pedro.ac@abastible.cl'].id
                        });
                    }
                }
            }


            // 5. Create Compromisos (simulated for some)
            if (scen.state !== 'pendiente' && Math.random() > 0.7) {
                await Compromiso.create({
                    registro_id: registro.id,
                    contratista_asignacion_id: contratistaAsignacionID, // Linked to assignment
                    responsable_id: createdUsers['contratista@demo.cl'].id,
                    creado_por_id: createdUsers['pedro.ac@abastible.cl'].id,
                    descripcion: 'Compromiso de mejora por hallazgo en auditoría',
                    fecha_compromiso: new Date(),
                    estado: 'pendiente',
                    observacion_cumplimiento: null
                });
            }
        }

        // ============= ORDER 5: REMOVED (Licitaciones) =============

        // ============= ORDER 6: Solicitudes Reapertura =============
        console.log('🚀 Generando Solicitudes de Reapertura...');
        // Create a closed register first to request reopening
        const registroCerrado = await Registro.create({
            user_id: createdUsers['contratista@demo.cl'].id,
            contratista_asignacion_id: contratistaAsignacionID,
            periodo: new Date(2025, 11, 1), // Dec 2025
            estado_auditoria: 'auditada_sistema',
            porcentaje_cumplimiento: 80,
            auditado: 1,
            cerrado: 1,
            auditado_por: createdUsers['pedro.ac@abastible.cl'].id,
            fecha_auditoria: new Date()
        });

        await SolicitudReapertura.create({
            registro_id: registroCerrado.id,
            solicitante_id: createdUsers['contratista@demo.cl'].id,
            motivo: 'Error en la carga de evidencias de la actividad 1.2',
            estado: 'pendiente'
        });

        await SolicitudReapertura.create({
            registro_id: registroCerrado.id, // Can have multiple? Assuming logic allows for history
            solicitante_id: createdUsers['contratista@demo.cl'].id,
            motivo: 'Faltó adjuntar certificado de asistencia',
            estado: 'rechazada',
            aprobador_id: createdUsers['pedro.ac@abastible.cl'].id,
            comentario_respuesta: 'Documento ilegible',
            fecha_respuesta: new Date()
        });

        // ============= ORDER 7: Secondary Assignment =============
        console.log('🚀 Generando Asignación Secundaria (Aislamiento)...');
        await ContratistaAsignacion.create({
            user_id: createdUsers['roberto@demo2.cl'].id,
            tipo_contratista_id: tiposContratista[1].id,
            dependencia_id: dependencias[1].id,
            administrador_contrato_id: createdUsers['juan.ac@abastible.cl'].id, // Different ADC
            periodo_inicio: new Date()
        });

        console.log('');
        console.log('✅ Seed completado con Escenarios de Prueba!');
        console.log('📋 Credenciales: admin@abastible.cl / User123*');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
