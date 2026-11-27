// Elimina el scaffold demo completo (empresa sintética + su vinculación + los 4 usuarios
// demo y sus asociaciones directas). Deja intactas las cuentas núcleo permanentes
// (oval@ovalcontrol.com, admin@abastible.cl — nunca gestionadas por este par de seeders)
// y la taxonomía demo (Gerencia/Subgerencia/Servicio/Dependencia DEMO: se dejan, son
// etiquetas reutilizables e inofensivas si quedan sin uso).
//
// Uso manual: node scripts/remove_demo_users.js   (desde back/)
// Se ejecuta también en cada deploy si DEMO_USERS_ENABLED=false (o no está definida) —
// ver scripts/seed_demo_users.js y .github/workflows/deploy-*.yml.
//
// Reversible: volver a correr scripts/seed_demo_users.js (o poner DEMO_USERS_ENABLED=true
// y desplegar) recrea la misma empresa/contrato/usuarios — por ejemplo, para hacer checks
// de hotfix en producción.

const bcrypt = require('bcryptjs');
const { User, Contratista, Vinculacion, ContratistaUsuario, VinculacionUsuario, Administracion } = require('../src/database/models');
const { DEMO_CONTRATISTA_RUT } = require('../src/utils/demoScaffold');

const DEMO_EMAILS = [
    'administrador.contrato@abastible.cl',
    'contratista.admin@demo.cl',
    'contratista.usuario@demo.cl',
    'contratista.usuario2@demo.cl'
];

async function run() {
    try {
        console.log('🔄 Eliminando el scaffold demo (usuarios contratista/ADC + empresa + vinculación)...');
        console.log('ℹ️ Se preserva/asegura la cuenta Admin Dios (admin@abastible.cl).');
        let removedCount = 0;

        // Ensure core Admin Dios user (admin@abastible.cl) exists and remains active with role 'admin'
        const adminEmail = 'admin@abastible.cl';
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });
        if (!existingAdmin) {
            const holder = await User.findOne({ where: { usu_id: 2 } });
            if (!holder) {
                const hashedPassword = await bcrypt.hash('User123*', 10);
                await User.create({
                    name: 'Administrador OIEM',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    usu_id: 2,
                    id: 2,
                    activo: 1
                });
                console.log('✅ Creado usuario Admin Dios: admin@abastible.cl (usu_id=2, role=admin)');
            } else {
                console.log(`ℹ️ usu_id=2 ya ocupado por ${holder.email}; admin@abastible.cl omitido.`);
            }
        } else {
            const updates = {};
            if (existingAdmin.role !== 'admin') updates.role = 'admin';
            if (existingAdmin.activo !== 1 && existingAdmin.activo !== true) updates.activo = 1;
            if (Object.keys(updates).length > 0) {
                await existingAdmin.update(updates);
                console.log(`🔧 Restaurado Admin Dios (${adminEmail}): ${JSON.stringify(updates)}`);
            } else {
                console.log(`ℹ️ Admin Dios verificado y activo: ${adminEmail} (usu_id=${existingAdmin.usu_id}, role=${existingAdmin.role})`);
            }
        }

        for (const email of DEMO_EMAILS) {
            const user = await User.findOne({ where: { email } });
            if (!user) {
                console.log(`ℹ️ ${email}: no existe, se omite.`);
                continue;
            }
            // Limpieza explícita de asociaciones directas (sin depender de FK físicas,
            // que ya no existen — ver scripts/drop_physical_foreign_keys.js).
            await ContratistaUsuario.destroy({ where: { user_id: user.usu_id } });
            await VinculacionUsuario.destroy({ where: { user_id: user.usu_id } });
            await Administracion.destroy({ where: { administrador_contrato_id: user.usu_id } });
            await user.destroy();
            console.log(`✅ Eliminado: ${email} (usu_id=${user.usu_id})`);
            removedCount++;
        }

        const contratista = await Contratista.findOne({ where: { rut: DEMO_CONTRATISTA_RUT } });
        if (contratista) {
            const vinculaciones = await Vinculacion.findAll({ where: { contratista_id: contratista.id } });
            for (const v of vinculaciones) {
                await Administracion.destroy({ where: { vinculacion_id: v.id } });
                await VinculacionUsuario.destroy({ where: { vinculacion_id: v.id } });
                await v.destroy();
            }
            await ContratistaUsuario.destroy({ where: { contratista_id: contratista.id } });
            await contratista.destroy();
            console.log(`✅ Eliminada empresa demo (rut ${DEMO_CONTRATISTA_RUT}) y ${vinculaciones.length} vinculación(es).`);
        } else {
            console.log('ℹ️ Empresa demo: no existe, se omite.');
        }

        console.log(`🎉 ${removedCount} usuario(s) demo eliminado(s).`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error eliminando el scaffold demo:', error.message);
        process.exit(1);
    }
}

run();
