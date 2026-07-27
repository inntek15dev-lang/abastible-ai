// Homologación de usu_id (ID de usuario de OvalControl como clave única del sistema).
// Regla de negocio: tras cada sincronización, users.usu_id debe quedar idéntico al usu_id
// de Oval, y TODAS las referencias en tablas hijas deben apuntar al valor homologado.

// Rango reservado para usuarios creados localmente (sin cuenta Oval), para que jamás
// colisionen con el espacio de IDs de OvalControl.
const LOCAL_USU_ID_START = 1000000;

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

    let user = email ? await User.findOne({ where: { email }, transaction }) : null;
    const holder = await User.findOne({ where: { usu_id: target }, transaction });

    const sameRow = user && holder &&
        String(holder.email).toLowerCase() === String(user.email).toLowerCase();

    if (holder && !user) {
        // El usu_id es la identidad estable: mismo usuario, email cambiado en Oval.
        return holder;
    }

    if (holder && user && !sameRow) {
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

module.exports = {
    LOCAL_USU_ID_START,
    USER_REFERENCE_COLUMNS,
    rekeyUserReferences,
    nextLocalUsuId,
    adoptOvalUsuId
};
