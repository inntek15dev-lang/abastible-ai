// IEEE Trace: REQ-009 | Vinculacion Controller
const { Vinculacion, Contratista, TipoContratista, Dependencia, Subgerencia, Gerencia, Administracion, VinculacionUsuario, User, sequelize } = require('../database/models');

const vinculacionController = {
    // GET /api/vinculaciones
    async index(req, res) {
        try {
            const { contratista_id, servicio_id, dependencia_id } = req.query;
            const where = { activo: 1 };

            if (contratista_id) where.contratista_id = contratista_id;
            if (servicio_id) where.servicio_id = servicio_id;
            if (dependencia_id) where.dependencia_id = dependencia_id;

            const vinculaciones = await Vinculacion.findAll({
                where,
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

    async store(req, res) {
        try {
            const { contratista_id, servicio_id, dependencia_id, fecha_inicio_contrato, fecha_termino_contrato, administrador_contrato_id, numero_contrato } = req.body;

            // Fetch Dependency to deduce Subgerencia and Gerencia
            const depInfo = await Dependencia.findByPk(dependencia_id, {
                include: [{ model: Subgerencia, as: 'subgerencia' }]
            });

            if (!depInfo || !depInfo.subgerencia) {
                return res.status(400).json({ success: false, message: 'La Dependencia seleccionada no tiene una Subgerencia/Gerencia válida.' });
            }

            const subgerencia_id = depInfo.subgerencia_id;
            const gerencia_id = depInfo.subgerencia.gerencia_id;

            // Validation: Check duplicate
            const existing = await Vinculacion.findOne({
                where: { contratista_id, servicio_id, dependencia_id, activo: 1 }
            });

            if (existing) {
                return res.status(400).json({ success: false, message: 'Ya existe una vinculación activa para este contratista, servicio y dependencia.' });
            }

            const vinculacion = await Vinculacion.create({
                contratista_id,
                servicio_id,
                dependencia_id,
                subgerencia_id,
                gerencia_id,
                fecha_inicio_contrato: fecha_inicio_contrato || null,
                fecha_termino_contrato: fecha_termino_contrato || null,
                numero_contrato
            });

            // Create Administracion if admin is provided
            if (administrador_contrato_id) {
                await Administracion.create({
                    vinculacion_id: vinculacion.id,
                    administrador_contrato_id,
                    activo: 1
                });
            }

            res.status(201).json({ success: true, data: vinculacion });
        } catch (error) {
            console.error('Vinculaciones store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear vinculacion' });
        }
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
    async assignAdmin(req, res) {
        try {
            const { id } = req.params;
            const { administrador_contrato_id } = req.body;

            const vinculacion = await Vinculacion.findByPk(id);
            if (!vinculacion) {
                return res.status(404).json({ success: false, message: 'Vinculacion no encontrada' });
            }

            const [admin, created] = await Administracion.findOrCreate({
                where: { vinculacion_id: id, administrador_contrato_id, activo: 1 },
                defaults: { activo: 1 }
            });

            res.json({ success: true, message: 'Administrador asignado correctamente' });
        } catch (error) {
            console.error('Vinculacion assignAdmin error:', error);
            res.status(500).json({ success: false, message: 'Error al asignar administrador' });
        }
    },

    // DELETE /api/vinculaciones/:id/admin/:adminId
    async removeAdmin(req, res) {
        try {
            const { id, adminId } = req.params;
            await Administracion.update(
                { activo: 0 },
                { where: { vinculacion_id: id, administrador_contrato_id: adminId, activo: 1 } }
            );
            res.json({ success: true, message: 'Administrador removido correctamente' });
        } catch (error) {
            console.error('Vinculacion removeAdmin error:', error);
            res.status(500).json({ success: false, message: 'Error al remover administrador' });
        }
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
