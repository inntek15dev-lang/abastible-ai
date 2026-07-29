// Repara los usuarios core/demo fijos del sistema si una re-sincronización con OVAL les
// sobrescribió nombre/rol/usu_id (ver utils/usuIdHomologation.js: PROTECTED_SYSTEM_EMAILS
// ya impide que esto vuelva a pasar, pero este script restaura el daño ya hecho).
// Uso manual, una sola vez: node scripts/restore_core_demo_names.js  (desde back/)
// NO se agrega al pipeline de deploy: es una reparación puntual, no una migración recurrente.
//
// Restaura por EMAIL (identidad que no cambia) los valores canónicos de src/seed.js:
// name, role, y usu_id (debe ser igual a id, 1-6, para nunca colisionar con el rango real
// de OVAL, cuyo mínimo observado es 267). Si usu_id cambió, usa la misma cascada de
// referencias que usa el homologador para no dejar FKs huérfanas en otras tablas.

const { sequelize, User } = require('../src/database/models');
const { rekeyUserReferences } = require('../src/utils/usuIdHomologation');

const CANONICAL = [
    { email: 'oval@ovalcontrol.com', name: 'Superusuario OVAL', role: 'oval', usu_id: 1 },
    { email: 'admin@abastible.cl', name: 'Administrador OIEM', role: 'admin', usu_id: 2 },
    { email: 'administrador.contrato@abastible.cl', name: 'Administrador de Contratos', role: 'administrador_contrato', usu_id: 3 },
    { email: 'contratista.admin@demo.cl', name: 'Contratista Administrador', role: 'contratista_admin', usu_id: 4 },
    { email: 'contratista.usuario@demo.cl', name: 'Contratista Usuario', role: 'contratista_user', usu_id: 5 },
    { email: 'contratista.usuario2@demo.cl', name: 'Contratista Usuario Dos', role: 'contratista_user', usu_id: 6 }
];

async function run() {
    try {
        console.log('🔄 Verificando usuarios core/demo fijos contra sus valores canónicos de seed.js...');
        let fixedCount = 0;

        for (const canon of CANONICAL) {
            const user = await User.findOne({ where: { email: canon.email } });
            if (!user) {
                console.log(`ℹ️ ${canon.email}: no existe en este ambiente, se omite.`);
                continue;
            }

            console.log(`   Estado actual de ${canon.email}: usu_id=${user.usu_id}, name="${user.name}", role="${user.role}"`);

            const currentUsuId = user.usu_id != null ? Number(user.usu_id) : null;
            if (currentUsuId !== canon.usu_id) {
                const holder = await User.findOne({ where: { usu_id: canon.usu_id } });
                if (holder && holder.email !== canon.email) {
                    console.error(`❌ ${canon.email}: no se puede restaurar a usu_id=${canon.usu_id}, ya lo tiene ${holder.email}. Resuelva manualmente.`);
                    continue;
                }
                const t = await sequelize.transaction();
                try {
                    if (currentUsuId !== null) {
                        await rekeyUserReferences(sequelize, currentUsuId, canon.usu_id, t);
                    }
                    await User.update({ usu_id: canon.usu_id }, { where: { email: canon.email }, transaction: t });
                    await t.commit();
                    console.log(`🔧 ${canon.email}: usu_id restaurado ${currentUsuId} -> ${canon.usu_id} (con cascada de referencias).`);
                    fixedCount++;
                } catch (rekeyErr) {
                    await t.rollback();
                    console.error(`❌ ${canon.email}: error restaurando usu_id:`, rekeyErr.message);
                    continue;
                }
            }

            const freshUser = await User.findOne({ where: { email: canon.email } });
            const updates = {};
            if (freshUser.name !== canon.name) updates.name = canon.name;
            if (freshUser.role !== canon.role) updates.role = canon.role;

            if (Object.keys(updates).length > 0) {
                console.log(`🔧 ${canon.email}: corrigiendo ${JSON.stringify(updates)}`);
                await freshUser.update(updates);
                fixedCount++;
            } else if (currentUsuId === canon.usu_id) {
                console.log(`✔ ${canon.email}: ya está correcto.`);
            }
        }

        console.log(`🎉 Verificación completada. ${fixedCount} corrección(es) aplicada(s).`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error restaurando usuarios core/demo:', error.message);
        process.exit(1);
    }
}

run();
