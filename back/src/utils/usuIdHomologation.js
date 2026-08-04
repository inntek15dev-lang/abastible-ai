// Homologación de usu_id (ID de usuario de OvalControl como clave única del sistema).
// Regla de negocio: tras cada sincronización, users.usu_id debe quedar idéntico al usu_id
// de Oval, y TODAS las referencias en tablas hijas deben apuntar al valor homologado.
const { Op } = require('sequelize');

// Rango reservado para usuarios creados localmente (sin cuenta Oval), para que jamás
// colisionen con el espacio de IDs de OvalControl.
const LOCAL_USU_ID_START = 1000000;

// Usuarios "core" (superadmin del sistema): la ÚNICA excepción a la homologación con
// Oval. Nunca se sincronizan desde la API externa y deben conservar los IDs de menor
// valor posible (no el rango local alto), sin colisionar jamás con un usu_id migrado.
const CORE_ROLE = 'admin';

// Únicos roles que OVAL gestiona/sincroniza. Cualquier otro rol (admin, contratista_user,
// oval) NUNCA debería adoptarse como "la misma persona que cambió de email en Oval" solo
// porque su usu_id local coincide numéricamente con el que envía Oval — esos usu_id locales
// son asignaciones internas (seed fijo o rango local), no identidades de Oval.
const OVAL_MANAGED_ROLES = ['contratista_admin', 'administrador_contrato'];

// Cuentas fijas del sistema (src/seed.js): usu_id === id, valores 1-6 a propósito, para
// nunca colisionar con el espacio real de OVAL (mínimo observado: 267). Dos de ellas
// (administrador.contrato@abastible.cl, contratista.admin@demo.cl) SÍ tienen un rol que
// OVAL gestiona (OVAL_MANAGED_ROLES), así que el guard por rol de más abajo NO las protege
// — son cuentas de prueba, jamás identidades reales de OVAL, así que deben quedar excluidas
// de la homologación de forma explícita e incondicional, sin importar rol ni heurística.
const PROTECTED_SYSTEM_EMAILS = new Set([
    'oval@ovalcontrol.com',
    'admin@abastible.cl',
    'administrador.contrato@abastible.cl',
    'contratista.admin@demo.cl',
    'contratista.usuario@demo.cl',
    'contratista.usuario2@demo.cl'
]);
const isProtectedEmail = (email) => !!email && PROTECTED_SYSTEM_EMAILS.has(String(email).trim().toLowerCase());

// Todas las columnas del sistema que referencian users.usu_id.
// NOTA: solicitudes_reapertura es el nombre real de la tabla (run_migration.js usaba
// "solicitudes_reaperturas" y esa actualización fallaba en silencio).
const USER_REFERENCE_COLUMNS = [
    { table: 'users', column: 'parent_id' },
    { table: 'contratista_usuarios', column: 'user_id' },
    { table: 'vinculacion_usuarios', column: 'user_id' },
    { table: 'administraciones', column: 'administrador_contrato_id' },
    { table: 'contratista_asignaciones', column: 'user_id' },
    { table: 'contratista_asignaciones', column: 'administrador_contrato_id' },
    { table: 'registros', column: 'user_id' },
    { table: 'registros', column: 'auditado_por' },
    { table: 'registro_logs', column: 'user_id' },
    { table: 'evidencias', column: 'user_id' },
    { table: 'hallazgos', column: 'auditor_id' },
    { table: 'compromisos', column: 'responsable_id' },
    { table: 'compromisos', column: 'creado_por_id' },
    { table: 'auditoria_comentarios', column: 'user_id' },
    { table: 'solicitudes_reapertura', column: 'solicitante_id' },
    { table: 'solicitudes_reapertura', column: 'aprobador_id' },
    { table: 'documentos', column: 'user_id' }
];

// Reapunta en cascada toda referencia de oldUsuId -> newUsuId dentro de la transacción.
const rekeyUserReferences = async (sequelize, oldUsuId, newUsuId, transaction) => {
    if (oldUsuId === null || oldUsuId === undefined) return;
    for (const { table, column } of USER_REFERENCE_COLUMNS) {
        try {
            await sequelize.query(
                `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${column}\` = ?`,
                { replacements: [newUsuId, oldUsuId], transaction }
            );
        } catch (err) {
            // Tablas opcionales que pueden no existir en todos los ambientes
            if (err.original && err.original.code === 'ER_NO_SUCH_TABLE') {
                console.warn(`⚠️ Tabla ${table} no existe en este ambiente; se omite en la cascada de usu_id.`);
                continue;
            }
            throw err;
        }
    }
};

// Próximo usu_id del rango local reservado (para desplazar titulares obsoletos o crear
// usuarios locales antes de que exista AUTO_INCREMENT en la columna).
const nextLocalUsuId = async (User, transaction) => {
    const max = await User.max('usu_id', { transaction });
    return Math.max(LOCAL_USU_ID_START, (Number(max) || 0) + 1);
};

/**
 * Resuelve la identidad local de un usuario según Oval (usu_id autoritativo + email) y
 * deja su usu_id homologado, con cascada de referencias. Retorna la instancia User ya
 * homologada, o null si no existe usuario local (el llamador debe crearlo con targetUsuId).
 *
 * Casos:
 *  - Existe por email, nadie posee el usu_id destino  -> re-keyea al usuario (cascada) y adopta.
 *  - Nadie con ese email, existe titular del usu_id   -> misma persona con email cambiado en
 *    Oval: retorna al titular (el llamador actualiza email/nombre).
 *  - Existe por email Y otro usuario distinto posee el usu_id destino:
 *      * si el titular parece backfill legacy (usu_id === id legacy), se le desplaza al rango
 *        local y se adopta el ID para el usuario del email;
 *      * si no, es un conflicto real de identidades -> error explícito (resolución manual).
 */
const adoptOvalUsuId = async ({ sequelize, User, email, targetUsuId, transaction }) => {
    const target = Number(targetUsuId);
    if (!Number.isFinite(target) || target <= 0) {
        throw new Error(`usu_id de Oval inválido: ${targetUsuId}`);
    }

    // Guard incondicional, previo a cualquier otra lógica: las cuentas fijas del sistema
    // (seed.js) jamás se tocan, sin importar rol ni heurística de "parece legacy".
    if (isProtectedEmail(email)) {
        throw new Error(
            `${email} es una cuenta fija del sistema; OVAL nunca puede asignarle/modificarle el usu_id. Resolución manual requerida.`
        );
    }

    let user = email ? await User.findOne({ where: { email }, transaction }) : null;
    const holder = await User.findOne({ where: { usu_id: target }, transaction });

    if (holder && isProtectedEmail(holder.email)) {
        throw new Error(
            `usu_id ${target} pertenece a la cuenta fija del sistema ${holder.email}; OVAL lo asigna a ${email}. Resolución manual requerida.`
        );
    }

    const sameRow = user && holder &&
        String(holder.email).toLowerCase() === String(user.email).toLowerCase();

    if (holder && !user) {
        // Antes de asumir "misma persona, email cambiado en Oval" hay que verificar que
        // el titular local sea siquiera un usuario gestionado por OVAL. Sin este guard,
        // un usu_id local de un usuario core/demo/contratista_user (asignado por seed fijo
        // o por el rango local, nunca por Oval) que numéricamente coincida con un usu_id
        // real de Oval hacía que ESE usuario (admin, cuenta demo, etc.) fuera adoptado como
        // si fuera la persona de Oval, sobrescribiéndole nombre/email/rol.
        if (!OVAL_MANAGED_ROLES.includes(holder.role)) {
            throw new Error(
                `Conflicto de identidad usu_id ${target}: lo posee localmente ${holder.email} (rol "${holder.role}", no gestionado por OVAL), pero OVAL lo asigna a ${email}. Resolución manual requerida.`
            );
        }
        // El usu_id es la identidad estable: mismo usuario, email cambiado en Oval.
        return holder;
    }

    if (holder && user && !sameRow) {
        if (!OVAL_MANAGED_ROLES.includes(holder.role)) {
            // Un titular con rol no gestionado por OVAL (admin, contratista_user, oval)
            // jamás se desplaza automáticamente, aunque "parezca legacy" (usu_id === id):
            // así se crean a propósito las cuentas core/demo en seed.js, y confundirlas con
            // un backfill legacy real las expondría a perder su identidad/nombre en cada sync.
            throw new Error(
                `Conflicto de identidad usu_id ${target}: lo posee localmente ${holder.email} (rol "${holder.role}", no gestionado por OVAL); Oval lo asigna a ${email}. Resolución manual requerida.`
            );
        }
        const holderLooksLegacy = holder.id !== null && Number(holder.usu_id) === Number(holder.id);
        if (!holderLooksLegacy) {
            throw new Error(
                `Conflicto de identidad usu_id ${target}: lo posee ${holder.email} pero Oval lo asigna a ${email}. Resolución manual requerida.`
            );
        }
        // Titular con backfill legacy: desplazarlo al rango local (con cascada) y liberar el ID.
        const freeId = await nextLocalUsuId(User, transaction);
        await rekeyUserReferences(sequelize, Number(holder.usu_id), freeId, transaction);
        await User.update({ usu_id: freeId }, { where: { usu_id: target }, transaction });
        console.warn(`🔁 usu_id ${target} liberado: ${holder.email} desplazado a ${freeId} (backfill legacy).`);
    }

    if (user) {
        const current = user.usu_id !== null && user.usu_id !== undefined ? Number(user.usu_id) : null;
        if (current !== target) {
            if (current !== null) {
                await rekeyUserReferences(sequelize, current, target, transaction);
            }
            await User.update({ usu_id: target }, { where: { email: user.email }, transaction });
            user = await User.findOne({ where: { email: user.email }, transaction });
            console.log(`✅ usu_id homologado para ${user.email}: ${current} -> ${target}`);
        }
    }

    return user;
};

/**
 * Renumera los usuarios core (rol admin) a los enteros positivos más bajos posibles
 * que no colisionen con ningún usu_id ya usado por otro usuario (Oval u otro). Se
 * ejecuta una sola vez como parte de la migración de PK, antes del backfill general,
 * para que el superadmin del sistema nunca termine en el rango local alto (≥1.000.000)
 * ni comparta ID con una cuenta migrada de Oval.
 */
const renumberCoreUsersToMinimum = async ({ sequelize, User, transaction }) => {
    const coreUsers = await User.findAll({ where: { role: CORE_ROLE }, order: [['usu_id', 'ASC']], transaction });
    if (coreUsers.length === 0) return [];

    const takenByOthers = new Set(
        (await User.findAll({ where: { role: { [Op.ne]: CORE_ROLE } }, transaction }))
            .filter(u => u.usu_id != null)
            .map(u => Number(u.usu_id))
    );

    const assignedNow = new Set();
    let candidate = 1;
    const nextFree = () => {
        while (takenByOthers.has(candidate) || assignedNow.has(candidate)) candidate++;
        return candidate;
    };

    const changes = [];
    for (const core of coreUsers) {
        const current = core.usu_id != null ? Number(core.usu_id) : null;
        // Ya está en el mínimo posible (nadie más lo reclama) y no colisiona: no tocar.
        if (current !== null && !takenByOthers.has(current) && !assignedNow.has(current)) {
            assignedNow.add(current);
            continue;
        }
        const freeId = nextFree();
        assignedNow.add(freeId);
        if (current !== null) {
            await rekeyUserReferences(sequelize, current, freeId, transaction);
        }
        await User.update({ usu_id: freeId }, { where: { email: core.email }, transaction });
        changes.push({ email: core.email, from: current, to: freeId });
        console.log(`✅ Usuario core ${core.email} renumerado: usu_id ${current} -> ${freeId}`);
    }
    return changes;
};

module.exports = {
    LOCAL_USU_ID_START,
    CORE_ROLE,
    OVAL_MANAGED_ROLES,
    PROTECTED_SYSTEM_EMAILS,
    isProtectedEmail,
    USER_REFERENCE_COLUMNS,
    rekeyUserReferences,
    nextLocalUsuId,
    adoptOvalUsuId,
    renumberCoreUsersToMinimum
};
