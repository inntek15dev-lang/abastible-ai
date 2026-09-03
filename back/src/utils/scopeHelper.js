// Helpers de scope compartidos: qué Vinculaciones (contratos) puede ver cada rol.
// Mismo patrón ya usado en controllers/resourceController.js, centralizado aquí para
// reutilizarlo en controllers que hoy no aplican ningún filtro de pertenencia/tenant
// (hallazgoController, evidenciaController, documentoController, compromisoController).
const { Op } = require('sequelize');
const { Vinculacion, Administracion, Registro } = require('../database/models');

const getContratistaAdminIds = (user) => {
    const cIds = [];
    if (Array.isArray(user.contratista_ids) && user.contratista_ids.length > 0) {
        cIds.push(...user.contratista_ids.map(Number));
    }
    if (user.contratista_id && !cIds.includes(Number(user.contratista_id))) {
        cIds.push(Number(user.contratista_id));
    }
    return cIds;
};

// null = sin restricción (admin/oval). Array (posiblemente vacío) = vinculacion_ids permitidos.
const getAllowedVinculacionIds = async (user) => {
    if (['admin', 'oval'].includes(user.role)) return null;

    if (user.role === 'administrador_contrato') {
        const recs = await Administracion.findAll({
            where: { administrador_contrato_id: user.id, activo: 1 },
            attributes: ['vinculacion_id']
        });
        return recs.map(r => Number(r.vinculacion_id));
    }

    if (user.role === 'contratista_admin') {
        const cIds = getContratistaAdminIds(user);
        if (cIds.length === 0) return [];
        const vincs = await Vinculacion.findAll({
            where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
            attributes: ['id']
        });
        return vincs.map(v => v.id);
    }

    if (user.role === 'contratista_user') {
        // Ancla por los contratos asignados (vinculacion_ids), nunca por
        // contratista_id/servicio/dependencia sueltos.
        return (user.vinculacion_ids && user.vinculacion_ids.length > 0)
            ? user.vinculacion_ids.map(Number)
            : (user.vinculacion_id ? [Number(user.vinculacion_id)] : []);
    }

    return [];
};

// Verifica que un Registro puntual esté dentro del scope del usuario.
const isRegistroInScope = async (user, registroId) => {
    if (!registroId) return false;
    const allowed = await getAllowedVinculacionIds(user);
    if (allowed === null) return true;
    if (allowed.length === 0) return false;

    const registro = await Registro.findByPk(registroId, { attributes: ['id', 'contratista_asignacion_id'] });
    if (!registro) return false;
    return allowed.includes(Number(registro.contratista_asignacion_id));
};
// Construye el fragmento where de scope para queries sobre Registro.
// Retorna {} para admin (sin restricción), { id: -1 } si no hay vinculaciones
// (0 resultados), o { contratista_asignacion_id: { [Op.in]: [...] } } para
// el resto de roles. Uso: const whereRegistro = await buildScopeWhere(user);
const buildScopeWhere = async (user) => {
    const vincIds = await getAllowedVinculacionIds(user);
    if (vincIds === null) return {};  // admin/oval: sin restricción
    if (vincIds.length === 0) return { id: -1 };  // sin vinculaciones: 0 resultados
    return { contratista_asignacion_id: { [Op.in]: vincIds } };
};

module.exports = { getContratistaAdminIds, getAllowedVinculacionIds, isRegistroInScope, buildScopeWhere };
