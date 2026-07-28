// IEEE Trace: REQ-009 | Vinculacion Controller
const { Vinculacion, Contratista, TipoContratista, Dependencia, Subgerencia, Gerencia, Administracion, VinculacionUsuario, User, sequelize } = require('../database/models');

const vinculacionController = {
    // GET /api/vinculaciones
    async index(req, res) {
        try {
            const { contratista_id, servicio_id, dependencia_id } = req.query;
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
                // Único contrato al que fue asignado (vía VinculacionUsuario). SIN esta rama,
                // caía en el "else" y veía TODAS las vinculaciones del sistema (todas las
                // empresas, todos los admins de contrato, todos los usuarios asignados).
                delete where.contratista_id;
                delete where.servicio_id;
                delete where.dependencia_id;
                where.id = req.user.vinculacion_id || -1;
                console.log(`[Vinculacion Controller - GET /api/vinculaciones] User is contratista_user (ID: ${userId}). Filtering vinculaciones where id = ${where.id}`);
            } else {
                console.log(`[Vinculacion Controller - GET /api/vinculaciones] User role: ${role} (ID: ${userId}). No specific role filter applied to Vinculacion query.`);
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
