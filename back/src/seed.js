// IEEE Trace: All Entities | seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const pathModule = require('path');
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
        console.log('🔄 Sincronizando base de datos (safe sync)...');
        // Usamos sync() sin force: true para no borrar la data existente
        await sequelize.sync();

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

        console.log('📦 Sincronizando dependencias...');
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
            { nombre: 'Distribución Envasado', descripcion: 'Contratista de distribución envasado', programa_id: programas[0].id, activo: 1 },
            { nombre: 'Distribución Granel', descripcion: 'Contratista de distribución granel', programa_id: programas[1].id, activo: 1 },
            { nombre: 'Distribución Envasado Acotado', descripcion: 'Contratista de distribución envasado acotado', programa_id: programas[2].id, activo: 1 },
            { nombre: 'Producción Movilizado', descripcion: 'Asignación de producción movilizado', programa_id: programas[3].id, activo: 1 }
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

        // Roles adicionales
        const dynamicPrivs = [
            { role: roles[1], modules: ['Dashboard', 'Registros', 'Contratistas', 'Reaperturas', 'Compromisos', 'Auditoria', 'Reportes', 'Registros_Exportar', 'Programas'] },
            { role: roles[2], modules: ['Dashboard', 'Registros', 'Evidencias', 'Reaperturas', 'Usuarios', 'Compromisos', 'Reportes', 'Registros_Exportar', 'Programas'] },
            { role: roles[3], modules: ['Dashboard', 'Registros', 'Evidencias', 'Registros_Exportar', 'Programas'] }
        ];

        for (const dp of dynamicPrivs) {
            for (const mod of dp.modules) {
                await Privilegio.findOrCreate({
                    where: { role_id: dp.role.id, ref_modulo: mod },
                    defaults: {
                        read: 1,
                        write: dp.role.name === 'administrador_contrato' ? (['Registros'].includes(mod) ? 0 : 1) : 
                               (dp.role.name === 'contratista_admin' ? (['Registros', 'Evidencias', 'Usuarios'].includes(mod) ? 1 : 0) : 
                               (['Registros', 'Evidencias'].includes(mod) ? 1 : 0)),
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
        const vinculaciones = [];
        for (const v of vinculacionesSource) {
            const [vinculacion] = await Vinculacion.findOrCreate({
                where: { 
                    contratista_id: v.contratista_id, 
                    servicio_id: v.servicio_id, 
                    dependencia_id: v.dependencia_id,
                    numero_contrato: v.numero_contrato
                },
                defaults: v
            });
            vinculaciones.push(vinculacion);
        }

        // ============= ORDER 4: Usuarios =============
        console.log('📦 Sincronizando usuarios...');
        const hashedPassword = await bcrypt.hash('User123*', 10);

        // 1. Admin OIEM (admin) - CASO ESPECIAL: Siempre se restaura
        const [adminOiem, created] = await User.findOrCreate({
            where: { email: 'admin@abastible.cl' },
            defaults: {
                name: 'Administrador OIEM',
                password: hashedPassword,
                role: 'admin',
                activo: 1
            }
        });

        if (!created) {
            console.log('⚠️ Restaurando usuario administrador (admin@abastible.cl)...');
            await adminOiem.update({
                name: 'Administrador OIEM',
                password: hashedPassword,
                role: 'admin',
                activo: 1
            });
        }

        // Usuarios regulares (idempotentes)
        const regularUsers = [
            { name: 'Administrador de Contratos', email: 'administrador.contrato@abastible.cl', password: hashedPassword, role: 'administrador_contrato', activo: 1 },
            { name: 'Contratista Administrador', email: 'contratista.admin@demo.cl', password: hashedPassword, role: 'contratista_admin', contratista_id: mafran.id, activo: 1 }
        ];

        const usersCreated = { adminOiem };
        for (const u of regularUsers) {
            const [user] = await User.findOrCreate({
                where: { email: u.email },
                defaults: u
            });
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

        // ============= ORDER 5: Asignación y Administración =============
        console.log('📦 Sincronizando asignaciones y administración...');
        await ContratistaAsignacion.findOrCreate({
            where: { 
                user_id: usersCreated.contratistaAdmin.id,
                tipo_contratista_id: tiposContratista[1].id,
                dependencia_id: dependencias[9].id
            },
            defaults: {
                administrador_contrato_id: usersCreated.adminContrato.id,
                periodo_inicio: new Date('2026-02-01')
            }
        });

        await Administracion.findOrCreate({
            where: { vinculacion_id: vinculaciones[11].id },
            defaults: {
                administrador_contrato_id: usersCreated.adminContrato.id,
                activo: 1
            }
        });

        // ============= EVIDENCE TEMPLATES =============
        console.log('📦 Cargando templates de evidencia...');
        // (La lógica existente de templates ya es bastante segura por el fs.existsSync y update idempotente)
        // Pero vamos a envolverla o dejarla igual si consideramos que no rompe nada manual.
        // El update de Actividad.template_url es directo, pero Actividad ya existe.
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
            const evidSanitized = sanitizeStr(entry.evidenceName).substring(0, 50);
            const fileName = `template_evidencia_actividad_${targetActividad.id}_${evidSanitized}${ext}`;

            const sourceDir = entry.isRaw ? templateRawSource : templateSource;
            const sourcePath = pathModule.join(sourceDir, entry.templateFile);
            const destPath = pathModule.join(targetDir, fileName);

            if (fs.existsSync(sourcePath)) {
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(sourcePath, destPath);
                }
                const templateUrl = ['storage', storageRelativePath.split(pathModule.sep).join('/'), fileName].join('/');
                await targetActividad.update({ template_url: templateUrl });
                templatesLoaded++;
            }
        }
        console.log(`✅ ${templatesLoaded} templates de evidencia procesados`);

        console.log('');
        console.log('✅ Sincronización base completada exitosamente!');
        console.log('📋 Nota: Solo el usuario admin@abastible.cl fue restaurado forzosamente.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
