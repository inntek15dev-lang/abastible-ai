// IEEE Trace: All Entities | seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const pathModule = require('path');
const {
    sequelize,
    Role,
    Privilegio,
    Gerencia,
    Subgerencia,
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
    Administracion,
    VinculacionUsuario,
    Registro,
    RegistroActividad,
    RegistroLog,
    Compromiso
} = require('./database/models');

async function seed() {
    try {
        console.log('🔄 Sincronizando base de datos (FORCE SYNC: DROP ALL TABLES)...');
        await sequelize.sync({ force: true });


        // ============= ORDER 0: Base tables =============
        console.log('📦 Sincronizando roles...');
        const rolesData = [
            { name: 'admin', guard_name: 'web' },
            { name: 'administrador_contrato', guard_name: 'web' },
            { name: 'contratista_admin', guard_name: 'web' },
            { name: 'contratista_user', guard_name: 'web' }
        ];
        const roles = [];
        for (const r of rolesData) {
            const [role] = await Role.findOrCreate({
                where: { name: r.name },
                defaults: r
            });
            roles.push(role);
        }

        console.log('📦 Sincronizando configuraciones...');
        const configData = [
            { clave: 'meta_programa', valor: '85', descripcion: 'Meta de cumplimiento del programa OIEM (%)', tipo: 'text' },
            { clave: 'fecha_limite_reporte', valor: '5', descripcion: 'Día hábil límite para reporte', tipo: 'number' },
            { clave: 'dias_cierre_hallazgo', valor: '30', descripcion: 'Días máximos para cierre de hallazgos', tipo: 'number' },
            { clave: 'evidencia_obligatoria', valor: '1', descripcion: 'Evidencia obligatoria para todas las actividades', tipo: 'boolean' },
            { clave: 'max_evidencias_por_actividad', valor: '4', descripcion: 'Máximo de evidencias por actividad', tipo: 'integer' }
        ];
        for (const c of configData) {
            await Configuracion.findOrCreate({
                where: { clave: c.clave },
                defaults: c
            });
        }

        console.log('📦 Sincronizando Gerencias...');
        const [gerenciaDistribucion] = await Gerencia.findOrCreate({
            where: { nombre: 'GERENCIA DE DISTRIBUCIÓN' },
            defaults: { activo: 1 }
        });

        console.log('📦 Sincronizando Subgerencias...');
        const [subgerenciaOperaciones] = await Subgerencia.findOrCreate({
            where: { nombre: 'SUBGERENCIA OPERACIONES DE DISTRIBUCIÓN' },
            defaults: { gerencia_id: gerenciaDistribucion.id, activo: 1 }
        });

        console.log('📦 Sincronizando dependencias...');
        const dependenciasData = [
            { nombre: 'OFICINA CHILLAN', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'OFICINA DISTRIBUCIÓN LENGA', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'OFICINA TEMUCO', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'OFICINA VILLARRICA', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'OFICINA DISTRIBUCIÓN MAIPÚ', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'OFICINA DISTRIBUCIÓN OSORNO', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'PLANTA COYAHIQUE', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'OFICINA LOS ANGELES', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'PLANTA LENGA', subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'PLANTA OSORNO', subgerencia_id: subgerenciaOperaciones.id, activo: 1 }
        ];
        const dependencias = [];
        for (const d of dependenciasData) {
            const [dep] = await Dependencia.findOrCreate({
                where: { nombre: d.nombre },
                defaults: d
            });
            dependencias.push(dep);
        }

        console.log('📦 Sincronizando programas...');
        const programasData = [
            { nombre: 'OIM Distribución Envasado', descripcion: 'Programa HSE y Operacional Distribución Envasado', activo: 1 },
            { nombre: 'OIM Distribución Granel', descripcion: 'Programa HSE y Operacional Distribución Granel', activo: 1 },
            { nombre: 'OIM Distribución Envasado Acotado', descripcion: 'Programa HSE y Operacional Distribución Envasado Acotado', activo: 1 },
            { nombre: 'Programa OIEM Produccion Movilizado', descripcion: 'Programa HSE y Operacional Producción Movilizado', activo: 1 }
        ];
        const programas = [];
        for (const p of programasData) {
            const [prog] = await Programa.findOrCreate({
                where: { nombre: p.nombre },
                defaults: p
            });
            programas.push(prog);
        }

        // ============= ORDER 1: Tables with FK to order 0 =============
        console.log('📦 Sincronizando tipos de contratista (servicios)...');
        const tiposContratistaData = [
            { nombre: 'Distribución Envasado', descripcion: 'Contratista de distribución envasado', programa_id: programas[0].id, subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'Distribución Granel', descripcion: 'Contratista de distribución granel', programa_id: programas[1].id, subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'Distribución Envasado Acotado', descripcion: 'Contratista de distribución envasado acotado', programa_id: programas[2].id, subgerencia_id: subgerenciaOperaciones.id, activo: 1 },
            { nombre: 'Producción Movilizado', descripcion: 'Asignación de producción movilizado', programa_id: programas[3].id, subgerencia_id: subgerenciaOperaciones.id, activo: 1 }
        ];
        const tiposContratista = [];
        for (const t of tiposContratistaData) {
            const [tipo] = await TipoContratista.findOrCreate({
                where: { nombre: t.nombre, programa_id: t.programa_id },
                defaults: t
            });
            tiposContratista.push(tipo);
        }

        const allActividades = [];
        const datasets = [
            { data: require('./data/granel'), programa_id: programas[1].id, msg: 'Granel' },
            { data: require('./data/envasado'), programa_id: programas[0].id, msg: 'Envasado' },
            { data: require('./data/envasado_acotado'), programa_id: programas[2].id, msg: 'Envasado Acotado' },
            { data: require('./data/produccion_movilizado'), programa_id: programas[3].id, msg: 'Produccion Movilizado' }
        ];

        for (const ds of datasets) {
            console.log(`📦 Sincronizando elementos y actividades de ${ds.msg}...`);
            let ordElm = 1;
            for (const data of ds.data) {
                const [elemento] = await Elemento.findOrCreate({
                    where: { programa_id: ds.programa_id, numero: data.numero },
                    defaults: {
                        nombre: data.nombre,
                        descripcion: `Elemento ${data.numero}: ${data.nombre}`,
                        orden: ordElm++
                    }
                });

                let ordAct = 1;
                for (const act of data.actividades) {
                    const [actividad] = await Actividad.findOrCreate({
                        where: { elemento_id: elemento.id, codigo: act.codigo },
                        defaults: {
                            actividad: `${act.codigo} - ${data.nombre}`,
                            descripcion: act.descripcion,
                            criterios: act.criterios,
                            frecuencia: act.frecuencia,
                            requiere_evidencia: act.requiere_evidencia,
                            orden: ordAct++,
                            activo: 1
                        }
                    });
                    allActividades.push(actividad);
                }
            }
        }

        console.log('📦 Sincronizando privilegios...');
        const privilegiosData = [
            { role_id: roles[0].id, ref_modulo: '*', read: 1, write: 1, excec: 1 },
            { role_id: roles[0].id, ref_modulo: 'Auditoria', read: 1, write: 1, excec: 1 },
            { role_id: roles[0].id, ref_modulo: 'Reportes', read: 1, write: 1, excec: 1 },
            { role_id: roles[0].id, ref_modulo: 'Registros_Exportar', read: 1, write: 1, excec: 1 }
        ];

        for (const p of privilegiosData) {
            await Privilegio.findOrCreate({
                where: { role_id: p.role_id, ref_modulo: p.ref_modulo },
                defaults: p
            });
        }

        const dynamicPrivs = [
            { role: roles[1], modules: ['Dashboard', 'Registros', 'Contratistas', 'Reaperturas', 'Compromisos', 'Auditoria', 'Reportes', 'Registros_Exportar', 'Programas', 'Vinculaciones', 'Gestion_Configuracion'] },
            { role: roles[2], modules: ['Dashboard', 'Registros', 'Evidencias', 'Reaperturas', 'Usuarios', 'Compromisos', 'Reportes', 'Registros_Exportar', 'Programas', 'Vinculaciones'] },
            { role: roles[3], modules: ['Dashboard', 'Registros', 'Evidencias', 'Usuarios', 'Registros_Exportar', 'Programas', 'Vinculaciones'] }
        ];

        for (const dp of dynamicPrivs) {
            for (const mod of dp.modules) {
                await Privilegio.findOrCreate({
                    where: { role_id: dp.role.id, ref_modulo: mod },
                    defaults: {
                        read: 1,
                        write: dp.role.name === 'administrador_contrato' ? (['Registros'].includes(mod) ? 0 : 1) : 
                               (dp.role.name === 'contratista_admin' ? (['Registros', 'Evidencias', 'Usuarios'].includes(mod) ? 1 : 0) : 
                               (['Registros', 'Evidencias', 'Usuarios'].includes(mod) ? 1 : 0)),
                        excec: 0
                    }
                });
            }
        }

        // ============= ORDER 2: Empresa Contratista =============
        console.log('📦 Sincronizando empresa contratista...');
        const [mafran] = await Contratista.findOrCreate({
            where: { rut: '76169976-8' },
            defaults: {
                nombre: 'SOC DE TRANSPORTE MAFRAN LTDA',
                activo: 1
            }
        });

        // ============= ORDER 3: Vinculaciones de MAFRAN =============
        console.log('📦 Sincronizando vinculaciones de MAFRAN...');
        const vinculacionesSource = [
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[0].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '265', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[1].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '277', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[2].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '297', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[3].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '303', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[4].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1207', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[5].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1208', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[6].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1248', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[0].id, dependencia_id: dependencias[7].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1320', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[7].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1397', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[8].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1399', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[3].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1400', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: mafran.id, servicio_id: tiposContratista[1].id, dependencia_id: dependencias[9].id, subgerencia_id: subgerenciaOperaciones.id, numero_contrato: '1401', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 }
        ];
        const vinculaciones = [];
        for (const v of vinculacionesSource) {
            const [vinculacion] = await Vinculacion.findOrCreate({
                where: { 
                    contratista_id: v.contratista_id, 
                    servicio_id: v.servicio_id, 
                    dependencia_id: v.dependencia_id,
                    subgerencia_id: v.subgerencia_id,
                    gerencia_id: gerenciaDistribucion.id,
                    numero_contrato: v.numero_contrato
                },
                defaults: { ...v, gerencia_id: gerenciaDistribucion.id }
            });
            vinculaciones.push(vinculacion);
        }

        // ============= ORDER 4: Usuarios =============
        console.log('📦 Sincronizando usuarios...');
        const hashedPassword = await bcrypt.hash('User123*', 10);

        const [adminOiem, adminCreated] = await User.findOrCreate({
            where: { email: 'admin@abastible.cl' },
            defaults: { name: 'Administrador OIEM', password: hashedPassword, role: 'admin', activo: 1 }
        });
        if (!adminCreated) await adminOiem.update({ password: hashedPassword, activo: 1 });

        const regularUsers = [
            { name: 'Administrador de Contratos', email: 'administrador.contrato@abastible.cl', password: hashedPassword, role: 'administrador_contrato', activo: 1 },
            { name: 'Contratista Administrador', email: 'contratista.admin@demo.cl', password: hashedPassword, role: 'contratista_admin', contratista_id: mafran.id, activo: 1 }
        ];
        const usersCreated = { adminOiem };
        for (const u of regularUsers) {
            const [user] = await User.findOrCreate({ where: { email: u.email }, defaults: u });
            if (u.role === 'administrador_contrato') usersCreated.adminContrato = user;
            if (u.role === 'contratista_admin') usersCreated.contratistaAdmin = user;
        }

        const [contratistaUser] = await User.findOrCreate({
            where: { email: 'contratista.usuario@demo.cl' },
            defaults: {
                name: 'Contratista Usuario',
                password: hashedPassword,
                role: 'contratista_user',
                contratista_id: mafran.id,
                tipo_contratista_id: tiposContratista[1].id,
                dependencia_id: dependencias[9].id,
                parent_id: usersCreated.contratistaAdmin.id,
                activo: 1
            }
        });

        const [contratistaUser2] = await User.findOrCreate({
            where: { email: 'contratista.usuario2@demo.cl' },
            defaults: {
                name: 'Contratista Usuario Dos',
                password: hashedPassword,
                role: 'contratista_user',
                contratista_id: mafran.id,
                tipo_contratista_id: tiposContratista[1].id,
                dependencia_id: dependencias[3].id,
                parent_id: usersCreated.contratistaAdmin.id,
                activo: 1
            }
        });

        console.log('📦 Sincronizando VinculacionUsuario...');
        await VinculacionUsuario.findOrCreate({
            where: { vinculacion_id: vinculaciones[11].id, user_id: contratistaUser.id },
            defaults: { activo: 1 }
        });
        await VinculacionUsuario.findOrCreate({
            where: { vinculacion_id: vinculaciones[10].id, user_id: contratistaUser2.id },
            defaults: { activo: 1 }
        });

        // ============= ORDER 5: Asignación y Administración =============
        console.log('📦 Sincronizando asignaciones y administración...');
        await ContratistaAsignacion.findOrCreate({
            where: { user_id: usersCreated.contratistaAdmin.id, tipo_contratista_id: tiposContratista[1].id, dependencia_id: dependencias[9].id },
            defaults: { administrador_contrato_id: usersCreated.adminContrato.id, periodo_inicio: new Date('2026-02-01') }
        });

        await ContratistaAsignacion.findOrCreate({
            where: { user_id: contratistaUser.id, tipo_contratista_id: tiposContratista[1].id, dependencia_id: dependencias[9].id },
            defaults: { administrador_contrato_id: usersCreated.adminContrato.id, periodo_inicio: new Date('2026-02-01') }
        });

        await ContratistaAsignacion.findOrCreate({
            where: { user_id: contratistaUser2.id, tipo_contratista_id: tiposContratista[1].id, dependencia_id: dependencias[3].id },
            defaults: { administrador_contrato_id: usersCreated.adminContrato.id, periodo_inicio: new Date('2026-02-01') }
        });

        await Administracion.findOrCreate({
            where: { vinculacion_id: vinculaciones[11].id },
            defaults: { administrador_contrato_id: usersCreated.adminContrato.id, activo: 1 }
        });

        // ============= EVIDENCE TEMPLATES =============
        console.log('📦 Cargando templates de evidencia...');
        const evidenceMap = require('./data/evidence_map.json');
        const templateSource = pathModule.resolve(__dirname, '..', 'storage', 'templates_evidencia');
        const templateRawSource = pathModule.resolve(__dirname, '..', 'storage', 'templates_raw');
        const storageRoot = pathModule.resolve(__dirname, '../../storage');
        const sanitizeStr = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        const programaIds = programas.map(p => p.id);
        let templatesLoaded = 0;

        for (const entry of evidenceMap) {
            if (!entry.templateFile) continue;
            const programaId = programaIds[entry.programIndex];
            if (!programaId) continue;
            const targetActividad = allActividades.find(act => act.codigo === entry.codigo);
            if (!targetActividad) continue;
            const elTarget = await Elemento.findByPk(targetActividad.elemento_id);
            if (!elTarget) continue;

            const storageRelativePath = pathModule.join('programas', String(programaId), 'evidencias', `elemento_${sanitizeStr(String(elTarget.numero))}`, `actividad_${sanitizeStr(String(targetActividad.codigo))}`);
            const targetDir = pathModule.join(storageRoot, storageRelativePath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            const ext = pathModule.extname(entry.templateFile) || '.xlsx';
            const fileName = `template_evidencia_actividad_${targetActividad.id}_${sanitizeStr(entry.evidenceName).substring(0, 50)}${ext}`;
            const sourcePath = pathModule.join(entry.isRaw ? templateRawSource : templateSource, entry.templateFile);
            const destPath = pathModule.join(targetDir, fileName);

            if (fs.existsSync(sourcePath)) {
                if (!fs.existsSync(destPath)) fs.copyFileSync(sourcePath, destPath);
                await targetActividad.update({ template_url: ['storage', storageRelativePath.split(pathModule.sep).join('/'), fileName].join('/') });
                templatesLoaded++;
            }
        }
        console.log(`✅ ${templatesLoaded} templates de evidencia procesados`);

        // ============= SAMPLE DATA: Registros, Logs & Compromisos =============
        console.log('🚀 Sincronizando data de muestra (Granel Mafran Osorno)...');
        const sampleData = [
            { period: '2025-08-01', estado: 'finalizado', avance: 100, personas: 15, dotacion: 20 },
            { period: '2025-09-01', estado: 'finalizado', avance: 100, personas: 16, dotacion: 20 },
            { period: '2025-10-01', estado: 'auditada', avance: 100, personas: 14, dotacion: 18 },
            { period: '2025-11-01', estado: 'subsanado', avance: 80, personas: 15, dotacion: 19 },
            { period: '2025-12-01', estado: 'pendiente', avance: 50, personas: 12, dotacion: 15 },
            { period: '2026-01-01', estado: 'borrador', avance: 10, personas: 10, dotacion: 12 }
        ];

        const vinc = vinculaciones[11];
        const activities = await Actividad.findAll({
            include: [{ model: Elemento, as: 'elemento', where: { programa_id: programas[1].id } }]
        });

        for (const item of sampleData) {
            const [registro, regCreated] = await Registro.findOrCreate({
                where: { periodo: item.period, contratista_asignacion_id: vinc.id },
                defaults: {
                    user_id: contratistaUser.id,
                    programa_id: programas[1].id,
                    dependencia_id: vinc.dependencia_id,
                    numero_contrato: vinc.numero_contrato,
                    eecc_nombre: mafran.nombre,
                    dependencia: 'PLANTA OSORNO',
                    personas_nuevas: Math.floor(item.personas / 4),
                    supervisores: 2, prevencionistas: 1, dotacion_total: item.dotacion,
                    porcentaje_cumplimiento: item.avance,
                    porcentaje_cumplimiento_auditor: item.estado === 'finalizado' ? item.avance : null,
                    auditado: item.estado === 'finalizado' ? 1 : 0,
                    cerrado: item.estado === 'finalizado' ? 1 : 0,
                    estado_auditoria: item.estado === 'borrador' ? 'pendiente' : item.estado,
                    auditado_por: (item.estado === 'finalizado' || item.estado === 'auditada') ? usersCreated.adminContrato.id : null,
                    fecha_auditoria: (item.estado === 'finalizado' || item.estado === 'auditada') ? new Date() : null
                }
            });

            if (regCreated && activities.length > 0) {
                await RegistroActividad.bulkCreate(activities.map(act => ({
                    registro_id: registro.id, actividad_id: act.id,
                    cumple: item.avance > 50 ? 1 : (Math.random() > 0.3 ? 1 : 0),
                    observacion: item.avance < 100 && Math.random() > 0.7 ? 'Observación de muestra' : null,
                    no_aplica: 0
                })));

                const logs = [{ registro_id: registro.id, user_id: contratistaUser.id, accion: 'CREACION', descripcion: 'Registro mensual iniciado.', created_at: new Date(new Date(item.period).getTime() + 1000) }];
                if (item.estado !== 'borrador' && item.estado !== 'pendiente') {
                    logs.push({ registro_id: registro.id, user_id: contratistaUser.id, accion: 'ENVIO', descripcion: 'Registro enviado.', created_at: new Date(new Date(item.period).getTime() + 5 * 24 * 60 * 60 * 1000) });
                    if (['auditada', 'finalizado', 'subsanado'].includes(item.estado)) {
                        logs.push({ registro_id: registro.id, user_id: usersCreated.adminContrato.id, accion: 'INICIO_AUDITORIA', descripcion: 'Auditoría iniciada.', created_at: new Date(new Date(item.period).getTime() + 7 * 24 * 60 * 60 * 1000) });
                    }
                    if (item.estado === 'subsanado') {
                        logs.push({ registro_id: registro.id, user_id: usersCreated.adminContrato.id, accion: 'OBSERVACION', descripcion: 'Observaciones emitidas.', created_at: new Date(new Date(item.period).getTime() + 10 * 24 * 60 * 60 * 1000) });
                        logs.push({ registro_id: registro.id, user_id: contratistaUser.id, accion: 'SUBSANACION', descripcion: 'Correcciones realizadas.', created_at: new Date(new Date(item.period).getTime() + 15 * 24 * 60 * 60 * 1000) });
                    }
                    if (item.estado === 'finalizado') {
                        logs.push({ registro_id: registro.id, user_id: usersCreated.adminContrato.id, accion: 'CIERRE_AUDITORIA', descripcion: 'Auditoría cerrada.', created_at: new Date(new Date(item.period).getTime() + 12 * 24 * 60 * 60 * 1000) });
                    }
                }
                await RegistroLog.bulkCreate(logs);

                if (item.period === '2025-11-01') {
                    await Compromiso.create({ registro_id: registro.id, responsable_id: contratistaUser.id, creado_por_id: usersCreated.adminContrato.id, descripcion: 'Renovar licencias vencidas.', fecha_compromiso: '2025-12-15', estado: 'pendiente' });
                } else if (item.period === '2025-08-01') {
                    await Compromiso.create({ registro_id: registro.id, responsable_id: contratistaUser.id, creado_por_id: usersCreated.adminContrato.id, descripcion: 'Capacitación vial.', fecha_compromiso: '2025-09-15', estado: 'cumplido', fecha_cumplimiento: '2025-09-12', observacion_cumplimiento: 'Realizada.' });
                }
            }
        }

        console.log('\n✅ Sincronización completa exitosamente!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
