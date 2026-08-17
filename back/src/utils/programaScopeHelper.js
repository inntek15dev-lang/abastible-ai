// Regla de negocio (global): un Servicio (TipoContratista) sin Programa asignado
// (programa_id NULL) no debe aparecer en ninguna vista operativa ni de reporte del
// sistema, ni tampoco nada que dependa de él en cascada (Vinculacion -> Registro /
// Compromiso / Hallazgo, y hacia arriba Gerencia / Subgerencia / Dependencia /
// Contratista). Aplica a TODOS los roles, incluido admin/oval — es un filtro de
// completitud de datos, no de RBAC.
//
// EXCEPCIONES EXPLÍCITAS (deben seguir mostrando absolutamente todo, sin este filtro):
//   - Gestor de Gerencias/Subgerencias/Servicios (servicioController.hierarchy/index/
//     show + CRUD de gerencias/subgerencias/servicios) — es la única vía para asignarle
//     un Programa a un servicio nuevo; si se le aplicara este filtro, un servicio recién
//     sincronizado sin programa jamás podría verse para corregirlo.
//   - Gestión de Contratistas (contratistaController.index/show).
//   - Módulo de Sincronización (syncController.compareData/syncData) — mismo motivo que
//     el gestor de servicios: es lo que crea los servicios que luego hay que programar.
const { Op } = require('sequelize');
const { TipoContratista, Vinculacion, Subgerencia } = require('../database/models');

// Calcula, en una sola pasada, todos los IDs "elegibles" (con programa asignado en su
// cadena) para cada nivel de la jerarquía. Se recalcula por request (sin cache) porque
// la asignación de programa_id puede cambiar en cualquier momento vía ServicioForm.
const getProgramaScope = async () => {
    const serviciosConPrograma = await TipoContratista.findAll({
        where: { programa_id: { [Op.not]: null } },
        attributes: ['id', 'subgerencia_id']
    });
    const servicioIds = serviciosConPrograma.map(s => s.id);

    if (servicioIds.length === 0) {
        return {
            servicioIds: [],
            vinculacionIds: [],
            subgerenciaIds: [],
            gerenciaIds: [],
            dependenciaIds: [],
            contratistaIds: []
        };
    }

    const subgerenciaIds = [...new Set(serviciosConPrograma.map(s => s.subgerencia_id).filter(Boolean))];

    const vinculaciones = await Vinculacion.findAll({
        where: { servicio_id: { [Op.in]: servicioIds }, activo: 1 },
        attributes: ['id', 'dependencia_id', 'contratista_id']
    });
    const vinculacionIds = vinculaciones.map(v => v.id);
    const dependenciaIds = [...new Set(vinculaciones.map(v => v.dependencia_id).filter(Boolean))];
    const contratistaIds = [...new Set(vinculaciones.map(v => v.contratista_id).filter(Boolean))];

    const subgerencias = subgerenciaIds.length > 0
        ? await Subgerencia.findAll({ where: { id: { [Op.in]: subgerenciaIds } }, attributes: ['id', 'gerencia_id'] })
        : [];
    const gerenciaIds = [...new Set(subgerencias.map(s => s.gerencia_id).filter(Boolean))];

    return { servicioIds, vinculacionIds, subgerenciaIds, gerenciaIds, dependenciaIds, contratistaIds };
};

// Helper de conveniencia: arma el operador Sequelize correcto según se pida el set
// "programado" (comportamiento por defecto en todo el sistema) o su inverso "huérfano"
// (solo_huerfanos=true, para revisión/limpieza — ver RN de retroactividad).
// Un array vacío de ids con Op.in siempre da 0 filas (correcto: nada programado aún);
// Op.notIn con array vacío da "todo" (correcto: todo es huérfano si no hay ids).
const scopeWhereClause = (ids, soloHuerfanos) => {
    return soloHuerfanos ? { [Op.notIn]: ids } : { [Op.in]: ids };
};

// Combina (AND lógico) una condición existente de un campo vinculacion_id/contratista_
// asignacion_id — que en este código base viene en 3 formas posibles: undefined (sin
// restricción previa), un valor único (ej. contratista_user con su única vinculación), o
// { [Op.in]: [...] } (el resto de roles/filtros) — con el set de ids elegibles por el
// filtro global de programa (o su complemento en modo huérfanos). Preserva el mismo
// patrón de intersección "tomar ids existentes, filtrar, reasignar" que ya usan los
// controllers, para poder componerse con cualquier filtro de rol/query previo sin
// tener que reescribir esa lógica existente.
const intersectWithProgramaScope = (existingCondition, eligibleIds, soloHuerfanos) => {
    const eligibleSet = new Set(eligibleIds.map(Number));
    const passes = (v) => soloHuerfanos ? !eligibleSet.has(Number(v)) : eligibleSet.has(Number(v));

    if (existingCondition === undefined || existingCondition === null) {
        return scopeWhereClause(eligibleIds, soloHuerfanos);
    }
    if (typeof existingCondition === 'object' && existingCondition[Op.in]) {
        const filtered = existingCondition[Op.in].filter(passes);
        return { [Op.in]: filtered.length > 0 ? filtered : [-1] };
    }
    // Valor único (number/string)
    return passes(existingCondition) ? existingCondition : -1;
};

module.exports = { getProgramaScope, scopeWhereClause, intersectWithProgramaScope };
