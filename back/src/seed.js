// IEEE Trace: Demo-Only Seed | seed.js
// REGLA: Este seed SOLO toca entidades DEMO. Círculo cerrado: demo → demo → demo.
// CERO dependencia de entidades reales (roles, config, programas, servicios reales, etc.)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
    sequelize,
    Gerencia,
    Subgerencia,
    Dependencia,
    TipoContratista,
    User,
    ContratistaAsignacion,
    Contratista,
    ContratistaUsuario,
    Vinculacion,
    Administracion,
    VinculacionUsuario
} = require('./database/models');

async function seed() {
    try {
        console.log('🔄 Sincronizando base de datos (Sincronización suave: force = false)...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await sequelize.sync({ force: false });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        // ============= ÁRBOL ORGANIZACIONAL DEMO =============
        console.log('📦 Sincronizando Gerencia Demo...');
        const [gerenciaDemo] = await Gerencia.findOrCreate({
            where: { nombre: 'GERENCIA DEMO' },
            defaults: { activo: 1 }
        });

        console.log('📦 Sincronizando Subgerencia Demo...');
        const [subgerenciaDemo] = await Subgerencia.findOrCreate({
            where: { nombre: 'SUBGERENCIA DEMO' },
            defaults: { gerencia_id: gerenciaDemo.id, activo: 1 }
        });

        console.log('📦 Sincronizando Dependencias Demo...');
        const [dependenciaDemo1] = await Dependencia.findOrCreate({
            where: { nombre: 'DEPENDENCIA DEMO 1' },
            defaults: { subgerencia_id: subgerenciaDemo.id, activo: 1 }
        });
        const [dependenciaDemo2] = await Dependencia.findOrCreate({
            where: { nombre: 'DEPENDENCIA DEMO 2' },
            defaults: { subgerencia_id: subgerenciaDemo.id, activo: 1 }
        });

        // ============= EMPRESAS CONTRATISTAS DEMO =============
        console.log('📦 Sincronizando empresa contratista demo 1...');
        const [contratistaDemo1] = await Contratista.findOrCreate({
            where: { rut: '76169976-8' },
            defaults: { nombre: 'EMPRESA DEMO 1 SPA', activo: 1 }
        });
        if (contratistaDemo1.nombre !== 'EMPRESA DEMO 1 SPA') {
            await contratistaDemo1.update({ nombre: 'EMPRESA DEMO 1 SPA' });
        }

        console.log('📦 Sincronizando empresa contratista demo 2...');
        const [contratistaDemo2] = await Contratista.findOrCreate({
            where: { rut: '77888999-K' },
            defaults: { nombre: 'EMPRESA DEMO2 SPA', activo: 1 }
        });
        if (contratistaDemo2.nombre !== 'EMPRESA DEMO2 SPA') {
            await contratistaDemo2.update({ nombre: 'EMPRESA DEMO2 SPA' });
        }

        // ============= SERVICIOS DEMO =============
        // programa_id: null por defecto. Si en BD ya tiene programa, persiste.
        console.log('📦 Sincronizando servicios demo...');
        const [servicioDemo1] = await TipoContratista.findOrCreate({
            where: { nombre: 'Servicio demo 1' },
            defaults: {
                descripcion: 'Servicio Demo 1 para datos de prueba',
                programa_id: null,
                subgerencia_id: subgerenciaDemo.id,
                activo: 1
            }
        });

        const [servicioDemo2] = await TipoContratista.findOrCreate({
            where: { nombre: 'Servicio demo 2' },
            defaults: {
                descripcion: 'Servicio Demo 2 para datos de prueba',
                programa_id: null,
                subgerencia_id: subgerenciaDemo.id,
                activo: 1
            }
        });

        // ============= VINCULACIONES DEMO =============
        console.log('📦 Sincronizando vinculaciones demo...');
        const vinculacionesData = [
            { contratista_id: contratistaDemo1.id, servicio_id: servicioDemo1.id, dependencia_id: dependenciaDemo1.id, subgerencia_id: subgerenciaDemo.id, gerencia_id: gerenciaDemo.id, numero_contrato: 'DEMO-1', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: contratistaDemo1.id, servicio_id: servicioDemo2.id, dependencia_id: dependenciaDemo2.id, subgerencia_id: subgerenciaDemo.id, gerencia_id: gerenciaDemo.id, numero_contrato: 'DEMO-2', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: contratistaDemo2.id, servicio_id: servicioDemo1.id, dependencia_id: dependenciaDemo1.id, subgerencia_id: subgerenciaDemo.id, gerencia_id: gerenciaDemo.id, numero_contrato: 'DEMO-3', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 },
            { contratista_id: contratistaDemo2.id, servicio_id: servicioDemo2.id, dependencia_id: dependenciaDemo2.id, subgerencia_id: subgerenciaDemo.id, gerencia_id: gerenciaDemo.id, numero_contrato: 'DEMO-4', fecha_inicio_contrato: '2026-02-01', fecha_termino_contrato: null, activo: 1 }
        ];

        const vinculaciones = [];
        for (const v of vinculacionesData) {
            const [vinculacion] = await Vinculacion.findOrCreate({
                where: { numero_contrato: v.numero_contrato },
                defaults: v
            });
            // Si la vinculación ya existía con FK apuntando a entidades reales, corregir a demo
            const needsUpdate =
                vinculacion.servicio_id !== v.servicio_id ||
                vinculacion.dependencia_id !== v.dependencia_id ||
                vinculacion.subgerencia_id !== v.subgerencia_id ||
                vinculacion.gerencia_id !== v.gerencia_id;
            if (needsUpdate) {
                await vinculacion.update({
                    servicio_id: v.servicio_id,
                    dependencia_id: v.dependencia_id,
                    subgerencia_id: v.subgerencia_id,
                    gerencia_id: v.gerencia_id
                });
            }
            vinculaciones.push(vinculacion);
        }

        // ============= USUARIOS DEMO =============
        console.log('📦 Sincronizando usuarios demo...');
        const hashedPassword = await bcrypt.hash('User123*', 10);

        const [ovalUser, ovalCreated] = await User.findOrCreate({
            where: { email: 'oval@ovalcontrol.com' },
            defaults: { name: 'Superusuario OVAL', password: hashedPassword, role: 'oval', usu_id: 1, id: 1, activo: 1 }
        });
        if (!ovalCreated) await ovalUser.update({ password: hashedPassword, usu_id: 1, id: 1, activo: 1 });

        const [adminOiem, adminCreated] = await User.findOrCreate({
            where: { email: 'admin@abastible.cl' },
            defaults: { name: 'Administrador OIEM', password: hashedPassword, role: 'admin', usu_id: 2, id: 2, activo: 1 }
        });
        if (!adminCreated) await adminOiem.update({ password: hashedPassword, usu_id: 2, id: 2, activo: 1 });

        const [adminContrato] = await User.findOrCreate({
            where: { email: 'administrador.contrato@abastible.cl' },
            defaults: { name: 'Administrador de Contratos', password: hashedPassword, role: 'administrador_contrato', usu_id: 3, id: 3, activo: 1 }
        });
        if (!adminContrato.usu_id) await adminContrato.update({ usu_id: 3, id: 3 });

        const adminContratoId = adminContrato.usu_id || adminContrato.id;

        // Administración de todas las vinculaciones demo
        if (adminContratoId) {
            for (const vinc of vinculaciones) {
                await Administracion.findOrCreate({
                    where: { vinculacion_id: vinc.id },
                    defaults: { administrador_contrato_id: adminContratoId, activo: 1 }
                });
            }
        }

        if (process.env.DEMO_USERS_ENABLED === 'true') {
            const [contratistaAdmin] = await User.findOrCreate({
                where: { email: 'contratista.admin@demo.cl' },
                defaults: { name: 'Contratista Administrador', password: hashedPassword, role: 'contratista_admin', contratista_id: contratistaDemo1.id, usu_id: 4, id: 4, activo: 1 }
            });
            if (!contratistaAdmin.usu_id) await contratistaAdmin.update({ usu_id: 4, id: 4 });
            const contratistaAdminId = contratistaAdmin.usu_id || contratistaAdmin.id;

            const [contratistaUser] = await User.findOrCreate({
                where: { email: 'contratista.usuario@demo.cl' },
                defaults: {
                    name: 'Contratista Usuario',
                    password: hashedPassword,
                    role: 'contratista_user',
                    contratista_id: contratistaDemo1.id,
                    tipo_contratista_id: servicioDemo2.id,
                    dependencia_id: dependenciaDemo2.id,
                    parent_id: 4,
                    usu_id: 5,
                    id: 5,
                    activo: 1
                }
            });
            const userId1 = contratistaUser.usu_id || contratistaUser.id;

            const [contratistaUser2] = await User.findOrCreate({
                where: { email: 'contratista.usuario2@demo.cl' },
                defaults: {
                    name: 'Contratista Usuario Dos',
                    password: hashedPassword,
                    role: 'contratista_user',
                    contratista_id: contratistaDemo1.id,
                    tipo_contratista_id: servicioDemo1.id,
                    dependencia_id: dependenciaDemo1.id,
                    parent_id: 4,
                    usu_id: 6,
                    id: 6,
                    activo: 1
                }
            });
            const userId2 = contratistaUser2.usu_id || contratistaUser2.id;

            // ============= RELACIONES DEMO =============
            console.log('📦 Sincronizando relaciones demo...');

            // VinculacionUsuario (usuario ↔ vinculación)
            if (userId1) {
                await VinculacionUsuario.findOrCreate({
                    where: { vinculacion_id: vinculaciones[1].id, user_id: userId1 },
                    defaults: { activo: 1 }
                });
            }
            if (userId2) {
                await VinculacionUsuario.findOrCreate({
                    where: { vinculacion_id: vinculaciones[0].id, user_id: userId2 },
                    defaults: { activo: 1 }
                });
            }

            // ContratistaAsignacion (usuario → servicio demo + dependencia demo)
            if (contratistaAdminId && adminContratoId) {
                await ContratistaAsignacion.findOrCreate({
                    where: { user_id: contratistaAdminId, tipo_contratista_id: servicioDemo2.id, dependencia_id: dependenciaDemo2.id },
                    defaults: { administrador_contrato_id: adminContratoId, periodo_inicio: new Date('2026-02-01') }
                });
            }
            if (userId1 && adminContratoId) {
                await ContratistaAsignacion.findOrCreate({
                    where: { user_id: userId1, tipo_contratista_id: servicioDemo2.id, dependencia_id: dependenciaDemo2.id },
                    defaults: { administrador_contrato_id: adminContratoId, periodo_inicio: new Date('2026-02-01') }
                });
            }
            if (userId2 && adminContratoId) {
                await ContratistaAsignacion.findOrCreate({
                    where: { user_id: userId2, tipo_contratista_id: servicioDemo1.id, dependencia_id: dependenciaDemo1.id },
                    defaults: { administrador_contrato_id: adminContratoId, periodo_inicio: new Date('2026-02-01') }
                });
            }

            // ContratistaUsuario (admin contratista ↔ empresas demo)
            await ContratistaUsuario.findOrCreate({
                where: { contratista_id: contratistaDemo1.id, user_id: contratistaAdminId }
            });
            await ContratistaUsuario.findOrCreate({
                where: { contratista_id: contratistaDemo2.id, user_id: contratistaAdminId }
            });
        }

        console.log('\n✅ Seed demo completado exitosamente!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
