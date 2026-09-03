// IEEE Trace: REQ-009 | Vinculacion Controller
const { Vinculacion, Contratista, TipoContratista, Dependencia, Subgerencia, Gerencia, Administracion, VinculacionUsuario, User, sequelize } = require('../database/models');
const { getAllowedVinculacionIds } = require('../utils/scopeHelper');
const { getProgramaScope, scopeWhereClause } = require('../utils/programaScopeHelper');

// Verifica que la vinculación pertenezca al scope del usuario (su empresa, su contrato
// administrado, o su vinculación asignada). null = sin restricción (admin/oval).
const assertVinculacionInScope = async (user, vinculacionId) => {
    const allowed = await getAllowedVinculacionIds(user);
    if (allowed === null) return true;
    return allowed.map(Number).includes(Number(vinculacionId));
};

const vinculacionController = {
    // GET /api/vinculaciones
    async index(req, res) {
        try {
            const { contratista_id, servicio_id, dependencia_id, solo_huerfanos, adc_id } = req.query;
            const { role, id: userId } = req.user;
            const where = { activo: 1 };

            if (contratista_id) where.contratista_id = contratista_id;
            if (servicio_id) where.servicio_id = servicio_id;
            if (dependencia_id) where.dependencia_id = dependencia_id;

            let includeAdmin = {
                model: Administracion,
                as: 'administraciones',
                where: { activo: 1 },
                required: false,
                include: [
                    { model: User, as: 'administradorContrato', attributes: ['id', 'name', 'email'] }
                ]
            };

            if (adc_id && adc_id !== 'todos') {
                includeAdmin.required = true;
                includeAdmin.where.administrador_contrato_id = adc_id;
            }

            if (role === 'administrador_contrato') {
                console.log(`[Vinculacion Controller - GET /api/vinculaciones] User is administrador_contrato (ID: ${userId}). Filtering vinculaciones where administrador_contrato_id = ${userId}`);
                includeAdmin.required = true;
                includeAdmin.where.administrador_contrato_id = userId;
            } else if (role === 'contratista_admin') {
                const { Op } = require('sequelize');
                const cIds = [];
                if (Array.isArray(req.user.contratista_ids) && req.user.contratista_ids.length > 0) {
                    cIds.push(...req.user.contratista_ids.map(Number));
                }
                if (req.user.contratista_id && !cIds.includes(Number(req.user.contratista_id))) {
                    cIds.push(Number(req.user.contratista_id));
                }
                console.log(`[Vinculacion Controller - GET /api/vinculaciones] User is contratista_admin (ID: ${userId}). Allowed contratista_ids: [${cIds.join(', ')}]. Filtering vinculaciones where contratista_id IN (${cIds.join(', ')})`);
                where.contratista_id = { [Op.in]: cIds.length > 0 ? cIds : [-1] };
            } else if (role === 'contratista_user') {
                const { Op } = require('sequelize');
                delete where.contratista_id;
                delete where.servicio_id;
                delete where.dependencia_id;

                const myVincIds = (req.user.vinculacion_ids && req.user.vinculacion_ids.length > 0)
                    ? req.user.vinculacion_ids
                    : (req.user.vinculacion_id ? [req.user.vinculacion_id] : []);

                where.id = { [Op.in]: myVincIds.length > 0 ? myVincIds : [-1] };
                console.log(`[Vinculacion Controller - GET /api/vinculaciones] User is contratista_user (ID: ${userId}). Filtering vinculaciones where id IN (${myVincIds.join(', ')})`);
            } else {
                console.log(`[Vinculacion Controller - GET /api/vinculaciones] User role: ${role} (ID: ${userId}). No specific role filter applied to Vinculacion query.`);
            }

            // Filtro global (todos los roles, sin excepción, incluido admin/oval): solo
            // vinculaciones cuyo servicio tiene un Programa asignado. solo_huerfanos=true
            // invierte el filtro para revisión/limpieza de lo que quedó sin programar.
            const soloHuerfanos = solo_huerfanos === 'true';
            const scope = await getProgramaScope();
            if (where.id !== undefined) {
                // contratista_user: where.id ya viene fijado a su única vinculación asignada.
                const eligibleIds = new Set(scope.vinculacionIds.map(Number));
                const singleId = Number(where.id);
                const passes = soloHuerfanos ? !eligibleIds.has(singleId) : eligibleIds.has(singleId);
                if (!passes) return res.json({ success: true, data: [] });
            } else {
                where.id = scopeWhereClause(scope.vinculacionIds, soloHuerfanos);
            }

            const vinculaciones = await Vinculacion.findAll({
                where,
                include: [
                    { model: Contratista, as: 'contratista' },
                    { model: TipoContratista, as: 'servicio' },
                    { model: Dependencia, as: 'dependencia' },
                    { model: Subgerencia, as: 'subgerencia' },
                    { model: Gerencia, as: 'gerencia' },
                    includeAdmin,
                    {
                        model: VinculacionUsuario,
                        as: 'usuariosVinculados',
                        where: { activo: 1 },
                        required: false,
                        include: [
                            { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'role'] }
                        ]
                    }
                ]
            });
            res.json({ success: true, data: vinculaciones });
        } catch (error) {
            console.error('Vinculaciones index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener vinculaciones' });
        }
    },

    // GET /api/vinculaciones/:id
    async show(req, res) {
        try {
            if (!(await assertVinculacionInScope(req.user, req.params.id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para ver esta vinculación' });
            }

            const vinculacion = await Vinculacion.findByPk(req.params.id, {
                include: [
                    { model: Contratista, as: 'contratista' },
                    { model: TipoContratista, as: 'servicio' },
                    { model: Dependencia, as: 'dependencia' },
                    { model: Subgerencia, as: 'subgerencia' },
                    { model: Gerencia, as: 'gerencia' },
                    {
                        model: Administracion,
                        as: 'administraciones',
                        where: { activo: 1 },
                        required: false,
                        include: [
                            { model: User, as: 'administradorContrato', attributes: ['id', 'name', 'email'] }
                        ]
                    },
                    {
                        model: VinculacionUsuario,
                        as: 'usuariosVinculados',
                        where: { activo: 1 },
                        required: false,
                        include: [
                            { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'role'] }
                        ]
                    }
                ]
            });

            if (!vinculacion) {
                return res.status(404).json({ success: false, message: 'Vinculacion no encontrada' });
            }

            res.json({ success: true, data: vinculacion });
        } catch (error) {
            console.error('Vinculaciones show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener vinculacion' });
        }
    },

    // POST /api/vinculaciones
    // BLOQUEADO: las vinculaciones (contratista + servicio + dependencia + contrato) son
    // data que reporta OVAL exclusivamente. Crear una manualmente la dejaría fuera del
    // espejo de OVAL y la próxima re-sincronización la eliminaría como residual.
    async store(req, res) {
        return res.status(403).json({
            success: false,
            message: 'Las vinculaciones se gestionan exclusivamente a través de la sincronización con OVAL. No pueden crearse manualmente.'
        });
    },

    // PUT /api/vinculaciones/:id
    async update(req, res) {
        try {
            if (!(await assertVinculacionInScope(req.user, req.params.id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para modificar esta vinculación' });
            }

            const vinculacion = await Vinculacion.findByPk(req.params.id);
            if (!vinculacion) {
                return res.status(404).json({ success: false, message: 'Vinculacion no encontrada' });
            }

            await vinculacion.update(req.body);
            res.json({ success: true, data: vinculacion });
        } catch (error) {
            console.error('Vinculaciones update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar vinculacion' });
        }
    },

    // DELETE /api/vinculaciones/:id
    async destroy(req, res) {
        try {
            if (!(await assertVinculacionInScope(req.user, req.params.id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para eliminar esta vinculación' });
            }

            const vinculacion = await Vinculacion.findByPk(req.params.id);
            if (!vinculacion) {
                return res.status(404).json({ success: false, message: 'Vinculacion no encontrada' });
            }

            // Soft delete
            await vinculacion.update({ activo: 0 });
            res.json({ success: true, message: 'Vinculacion eliminada' });
        } catch (error) {
            console.error('Vinculaciones destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar vinculacion' });
        }
    },

    // POST /api/vinculaciones/:id/admin
    // BLOQUEADO: el administrador de contrato de una vinculación es data que reporta OVAL
    // (administrador_contrato dentro de cada asignación) y se gestiona exclusivamente vía
    // sincronización.
    async assignAdmin(req, res) {
        return res.status(403).json({
            success: false,
            message: 'La asignación de administradores de contrato se gestiona exclusivamente a través de la sincronización con OVAL. No puede realizarse manualmente.'
        });
    },

    // DELETE /api/vinculaciones/:id/admin/:adminId
    // BLOQUEADO: mismo motivo que assignAdmin.
    async removeAdmin(req, res) {
        return res.status(403).json({
            success: false,
            message: 'La asignación de administradores de contrato se gestiona exclusivamente a través de la sincronización con OVAL. No puede modificarse manualmente.'
        });
    },

    // POST /api/vinculaciones/:id/usuarios
    async assignUser(req, res) {
        try {
            const { id } = req.params;
            const { user_id } = req.body;

            if (!(await assertVinculacionInScope(req.user, id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para asignar usuarios a esta vinculación' });
            }

            const vinculacion = await Vinculacion.findByPk(id);
            if (!vinculacion) {
                return res.status(404).json({ success: false, message: 'Vinculacion no encontrada' });
            }

            const [vUser, created] = await VinculacionUsuario.findOrCreate({
                where: { vinculacion_id: id, user_id, activo: 1 },
                defaults: { activo: 1 }
            });

            res.json({ success: true, message: 'Usuario asignado correctamente' });
        } catch (error) {
            console.error('Vinculacion assignUser error:', error);
            res.status(500).json({ success: false, message: 'Error al asignar usuario' });
        }
    },

    // DELETE /api/vinculaciones/:id/usuarios/:userId
    async removeUser(req, res) {
        try {
            const { id, userId } = req.params;

            if (!(await assertVinculacionInScope(req.user, id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para modificar usuarios de esta vinculación' });
            }

            await VinculacionUsuario.update(
                { activo: 0 },
                { where: { vinculacion_id: id, user_id: userId, activo: 1 } }
            );
            res.json({ success: true, message: 'Usuario removido correctamente' });
        } catch (error) {
            console.error('Vinculacion removeUser error:', error);
            res.status(500).json({ success: false, message: 'Error al remover usuario' });
        }
    }
};

module.exports = vinculacionController;
