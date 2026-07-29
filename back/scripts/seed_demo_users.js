// Crea (o repara) el scaffold demo completo del sistema: una empresa sintética (RUT/
// nombre que jamás puede coincidir con OVAL), una única vinculación con numero_contrato
// '1', y los 4 usuarios demo asociados. Complementa a scripts/remove_demo_users.js —
// ambos forman un par activar/desactivar controlado por DEMO_USERS_ENABLED (ver .env en
// el servidor y .github/workflows/deploy-*.yml).
//
// Uso manual: node scripts/seed_demo_users.js   (desde back/)
// Se ejecuta también en cada deploy si DEMO_USERS_ENABLED=true — es idempotente y
// autorreparable (si una fila ya existe pero con datos distintos al canónico, los
// corrige), así que correrlo repetidamente es seguro.
//
// NO incluye oval@ovalcontrol.com ni admin@abastible.cl: esas son cuentas núcleo
// permanentes del sistema, nunca gestionadas por este par de seeders (ver
// scripts/restore_core_demo_names.js si esas dos necesitan reparación puntual).
//
// Por qué una empresa sintética y no una real usada como demo (como "Mafran" antes):
// una empresa real de OVAL queda sujeta al espejo de la sincronización — su nombre se
// sobrescribe con lo que reporte OVAL, y si OVAL alguna vez deja de reportarla o alguno
// de sus contratos, la poda de residuales la elimina. Con RUT/contrato sintéticos eso es
// imposible, y además el guard explícito en syncController.js excluye este scaffold de
// toda poda, sin importar qué envíe OVAL.

const bcrypt = require('bcryptjs');
const {
    sequelize, User, Contratista, Vinculacion, VinculacionUsuario, ContratistaUsuario,
    Administracion, Gerencia, Subgerencia, TipoContratista, Dependencia
} = require('../src/database/models');
const { rekeyUserReferences } = require('../src/utils/usuIdHomologation');
const {
    DEMO_CONTRATISTA_RUT, DEMO_CONTRATISTA_NOMBRE, DEMO_GERENCIA, DEMO_SUBGERENCIA,
    DEMO_SERVICIO, DEMO_DEPENDENCIA, DEMO_NUMERO_CONTRATO
} = require('../src/utils/demoScaffold');

async function run() {
    try {
        console.log('🔄 Creando/asegurando el scaffold demo (empresa + contrato + usuarios)...');
        const hashedPassword = await bcrypt.hash('User123*', 10);

        const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: DEMO_GERENCIA }, defaults: { activo: 1 } });
        const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: DEMO_SUBGERENCIA, gerencia_id: gerencia.id }, defaults: { activo: 1 } });
        const [servicio] = await TipoContratista.findOrCreate({ where: { nombre: DEMO_SERVICIO, subgerencia_id: subgerencia.id }, defaults: { descripcion: 'Servicio demo del sistema', activo: 1 } });
        const [dependencia] = await Dependencia.findOrCreate({ where: { nombre: DEMO_DEPENDENCIA }, defaults: { activo: 1 } });

        const [contratista] = await Contratista.findOrCreate({
            where: { rut: DEMO_CONTRATISTA_RUT },
            defaults: { nombre: DEMO_CONTRATISTA_NOMBRE, activo: 1 }
        });
        if (contratista.nombre !== DEMO_CONTRATISTA_NOMBRE || contratista.activo !== 1) {
            await contratista.update({ nombre: DEMO_CONTRATISTA_NOMBRE, activo: 1 });
        }

        const [vinculacion] = await Vinculacion.findOrCreate({
            where: {
                contratista_id: contratista.id,
                servicio_id: servicio.id,
                dependencia_id: dependencia.id,
                subgerencia_id: subgerencia.id,
                gerencia_id: gerencia.id
            },
            defaults: {
                numero_contrato: DEMO_NUMERO_CONTRATO,
                fecha_inicio_contrato: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                activo: 1
            }
        });
        if (vinculacion.numero_contrato !== DEMO_NUMERO_CONTRATO || vinculacion.activo !== 1) {
            await vinculacion.update({ numero_contrato: DEMO_NUMERO_CONTRATO, activo: 1 });
        }

        // findOrCreate + auto-reparación: si ya existe pero con name/role/usu_id distinto
        // al canónico (p.ej. corrompido por una sincronización previa), lo corrige.
        const ensureUser = async ({ email, name, role, usu_id, extra = {} }) => {
            let user = await User.findOne({ where: { email } });
            if (!user) {
                // Si esta cuenta fue borrada como residual por un bug ya corregido (la
                // poda de contratista_admin/administrador_contrato no respetaba
                // PROTECTED_SYSTEM_EMAILS), su usu_id fijo podría haber sido adoptado
                // mientras tanto por un usuario real de OVAL. Verificar ANTES de crear,
                // para un error claro en vez de un choque de PK genérico.
                const holder = await User.findOne({ where: { usu_id } });
                if (holder) {
                    throw new Error(`No se puede crear ${email} con usu_id=${usu_id}: ya lo tiene ${holder.email} (rol "${holder.role}"). Resuelva manualmente antes de re-ejecutar este seeder (probablemente esa cuenta demo fue eliminada como residual por la sincronización antes del fix, y OVAL adoptó ese usu_id para un usuario real).`);
                }
                await User.create({ name, email, password: hashedPassword, role, usu_id, activo: 1, ...extra });
                // Re-fetch obligatorio: Sequelize pisa el usu_id de la instancia con el
                // insertId de MySQL al crear con usu_id explícito (columna AUTO_INCREMENT).
                user = await User.findOne({ where: { email } });
                console.log(`✅ Creado: ${email} (usu_id=${user.usu_id})`);
                return user;
            }

            const currentUsuId = user.usu_id != null ? Number(user.usu_id) : null;
            if (currentUsuId !== usu_id) {
                const holder = await User.findOne({ where: { usu_id } });
                if (holder && holder.email !== email) {
                    console.error(`❌ ${email}: no se puede fijar usu_id=${usu_id}, ya lo tiene ${holder.email}. Resuelva manualmente.`);
                } else {
                    const t = await sequelize.transaction();
                    try {
                        if (currentUsuId !== null) await rekeyUserReferences(sequelize, currentUsuId, usu_id, t);
                        await User.update({ usu_id }, { where: { email }, transaction: t });
                        await t.commit();
                        console.log(`🔧 ${email}: usu_id restaurado ${currentUsuId} -> ${usu_id} (con cascada).`);
                        user = await User.findOne({ where: { email } });
                    } catch (rekeyErr) {
                        await t.rollback();
                        console.error(`❌ ${email}: error restaurando usu_id:`, rekeyErr.message);
                    }
                }
            }

            const updates = {};
            if (user.name !== name) updates.name = name;
            if (user.role !== role) updates.role = role;
            if (user.activo !== 1) updates.activo = 1;
            if (Object.keys(updates).length > 0) {
                await user.update(updates);
                console.log(`🔧 ${email}: corregido ${JSON.stringify(updates)}`);
            } else if (Number(user.usu_id) === usu_id) {
                console.log(`ℹ️ Ya existe y está correcto: ${email} (usu_id=${user.usu_id})`);
            }
            return user;
        };

        const adminContrato = await ensureUser({ email: 'administrador.contrato@abastible.cl', name: 'Administrador de Contratos', role: 'administrador_contrato', usu_id: 3 });
        const contratistaAdmin = await ensureUser({ email: 'contratista.admin@demo.cl', name: 'Contratista Administrador', role: 'contratista_admin', usu_id: 4, extra: { contratista_id: contratista.id } });
        const contratistaUser = await ensureUser({ email: 'contratista.usuario@demo.cl', name: 'Contratista Usuario', role: 'contratista_user', usu_id: 5, extra: { parent_id: 4 } });
        const contratistaUser2 = await ensureUser({ email: 'contratista.usuario2@demo.cl', name: 'Contratista Usuario Dos', role: 'contratista_user', usu_id: 6, extra: { parent_id: 4 } });

        await ContratistaUsuario.findOrCreate({ where: { user_id: contratistaAdmin.usu_id, contratista_id: contratista.id } });
        await VinculacionUsuario.findOrCreate({ where: { vinculacion_id: vinculacion.id, user_id: contratistaUser.usu_id }, defaults: { activo: 1 } });
        await VinculacionUsuario.findOrCreate({ where: { vinculacion_id: vinculacion.id, user_id: contratistaUser2.usu_id }, defaults: { activo: 1 } });
        await Administracion.findOrCreate({ where: { vinculacion_id: vinculacion.id, administrador_contrato_id: adminContrato.usu_id }, defaults: { activo: 1 } });

        console.log('🎉 Scaffold demo listo.');
        process.exit(0);
    } catch (error) {
        // Sequelize reduce error.message a "Validation error" genérico para
        // SequelizeValidationError/SequelizeUniqueConstraintError — el detalle real
        // vive en error.errors (validación) o error.original (SQL).
        console.error('❌ Error creando el scaffold demo:', error.message);
        if (Array.isArray(error.errors)) {
            error.errors.forEach(e => console.error(`   - campo "${e.path}": ${e.message} (valor recibido: ${JSON.stringify(e.value)})`));
        }
        if (error.original) {
            console.error('   Detalle SQL:', error.original.message);
        }
        process.exit(1);
    }
}

run();
