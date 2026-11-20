// IEEE Trace: REQ-007 | Aviso Controller
const { Aviso, User } = require('../database/models');
const { Op } = require('sequelize');

const avisoController = {
    /**
     * List all avisos (Admin only)
     */
    async list(req, res) {
        try {
            const { search, estado } = req.query;
            const where = {};

            if (search && search.trim()) {
                where[Op.or] = [
                    { titulo: { [Op.like]: `%${search.trim()}%` } },
                    { contenido: { [Op.like]: `%${search.trim()}%` } }
                ];
            }

            const today = new Date().toISOString().slice(0, 10);

            if (estado === 'activo') {
                where.activo = true;
            } else if (estado === 'inactivo') {
                where.activo = false;
            } else if (estado === 'vigente') {
                where.activo = true;
                where.fecha_desde = { [Op.lte]: today };
                where.fecha_hasta = { [Op.gte]: today };
            } else if (estado === 'vencido') {
                where.fecha_hasta = { [Op.lt]: today };
            }

            const avisos = await Aviso.findAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'creador',
                        attributes: ['usu_id', 'id', 'name', 'email', 'role']
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            return res.json({
                success: true,
                data: avisos
            });
        } catch (error) {
            console.error('Error listing avisos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al listar los avisos',
                error: error.message
            });
        }
    },

    /**
     * Get single aviso by ID (Admin only)
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const aviso = await Aviso.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'creador',
                        attributes: ['usu_id', 'id', 'name', 'email', 'role']
                    }
                ]
            });

            if (!aviso) {
                return res.status(404).json({
                    success: false,
                    message: 'Aviso no encontrado'
                });
            }

            return res.json({
                success: true,
                data: aviso
            });
        } catch (error) {
            console.error('Error fetching aviso:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el aviso',
                error: error.message
            });
        }
    },

    /**
     * Create new aviso (Admin only)
     */
    async create(req, res) {
        try {
            const {
                titulo,
                contenido,
                fecha_desde,
                fecha_hasta,
                para_todos,
                roles,
                activo
            } = req.body;

            if (!titulo || !titulo.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'El título del aviso es obligatorio'
                });
            }

            if (!contenido || !contenido.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'El contenido del aviso es obligatorio'
                });
            }

            if (!fecha_desde || !fecha_hasta) {
                return res.status(400).json({
                    success: false,
                    message: 'Las fechas desde y hasta son obligatorias'
                });
            }

            if (fecha_hasta < fecha_desde) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de término no puede ser anterior a la fecha de inicio'
                });
            }

            const isParaTodos = Boolean(para_todos);
            const rolesArray = Array.isArray(roles) ? roles : [];

            if (!isParaTodos && rolesArray.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar al menos un rol o marcar como visible para todos'
                });
            }

            const creadoPorId = req.user?.usu_id || req.user?.id || null;

            const nuevoAviso = await Aviso.create({
                titulo: titulo.trim(),
                contenido,
                fecha_desde,
                fecha_hasta,
                para_todos: isParaTodos,
                roles: rolesArray,
                activo: activo !== undefined ? Boolean(activo) : true,
                creado_por_id: creadoPorId
            });

            const avisoConCreador = await Aviso.findByPk(nuevoAviso.id, {
                include: [
                    {
                        model: User,
                        as: 'creador',
                        attributes: ['usu_id', 'id', 'name', 'email', 'role']
                    }
                ]
            });

            return res.status(201).json({
                success: true,
                message: 'Aviso creado exitosamente',
                data: avisoConCreador
            });
        } catch (error) {
            console.error('Error creating aviso:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear el aviso',
                error: error.message
            });
        }
    },

    /**
     * Update aviso (Admin only)
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const aviso = await Aviso.findByPk(id);

            if (!aviso) {
                return res.status(404).json({
                    success: false,
                    message: 'Aviso no encontrado'
                });
            }

            const {
                titulo,
                contenido,
                fecha_desde,
                fecha_hasta,
                para_todos,
                roles,
                activo
            } = req.body;

            if (titulo !== undefined) {
                if (!titulo.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'El título no puede estar vacío'
                    });
                }
                aviso.titulo = titulo.trim();
            }

            if (contenido !== undefined) {
                if (!contenido.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'El contenido no puede estar vacío'
                    });
                }
                aviso.contenido = contenido;
            }

            if (fecha_desde !== undefined) aviso.fecha_desde = fecha_desde;
            if (fecha_hasta !== undefined) aviso.fecha_hasta = fecha_hasta;

            if (aviso.fecha_hasta < aviso.fecha_desde) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de término no puede ser anterior a la fecha de inicio'
                });
            }

            if (para_todos !== undefined) {
                aviso.para_todos = Boolean(para_todos);
            }

            if (roles !== undefined) {
                const rolesArray = Array.isArray(roles) ? roles : [];
                if (!aviso.para_todos && rolesArray.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Debe seleccionar al menos un rol o marcar como visible para todos'
                    });
                }
                aviso.roles = rolesArray;
            }

            if (activo !== undefined) {
                aviso.activo = Boolean(activo);
            }

            await aviso.save();

            const avisoActualizado = await Aviso.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'creador',
                        attributes: ['usu_id', 'id', 'name', 'email', 'role']
                    }
                ]
            });

            return res.json({
                success: true,
                message: 'Aviso actualizado correctamente',
                data: avisoActualizado
            });
        } catch (error) {
            console.error('Error updating aviso:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al actualizar el aviso',
                error: error.message
            });
        }
    },

    /**
     * Delete aviso (Admin only)
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const aviso = await Aviso.findByPk(id);

            if (!aviso) {
                return res.status(404).json({
                    success: false,
                    message: 'Aviso no encontrado'
                });
            }

            await aviso.destroy();

            return res.json({
                success: true,
                message: 'Aviso eliminado correctamente'
            });
        } catch (error) {
            console.error('Error deleting aviso:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar el aviso',
                error: error.message
            });
        }
    },

    /**
     * Toggle active state (Admin only)
     */
    async toggleActivo(req, res) {
        try {
            const { id } = req.params;
            const aviso = await Aviso.findByPk(id);

            if (!aviso) {
                return res.status(404).json({
                    success: false,
                    message: 'Aviso no encontrado'
                });
            }

            aviso.activo = !aviso.activo;
            await aviso.save();

            return res.json({
                success: true,
                message: `Aviso ${aviso.activo ? 'activado' : 'desactivado'} con éxito`,
                data: aviso
            });
        } catch (error) {
            console.error('Error toggling aviso status:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al cambiar estado del aviso',
                error: error.message
            });
        }
    },

    /**
     * Get active avisos for the current authenticated user (based on role and dates)
     * Used for the initial login/session popup modal
     */
    async getActive(req, res) {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const userRole = req.user?.role || '';

            // Find all active avisos valid today
            const avisos = await Aviso.findAll({
                where: {
                    activo: true,
                    fecha_desde: { [Op.lte]: today },
                    fecha_hasta: { [Op.gte]: today }
                },
                order: [['created_at', 'DESC']]
            });

            // Filter by user role or para_todos
            const activeForUser = avisos.filter(a => {
                if (a.para_todos) return true;
                if (req.user?.role === 'admin') return true; // Admin Dios can see all active announcements
                const rolesList = a.roles || [];
                return rolesList.includes(userRole);
            });

            return res.json({
                success: true,
                data: activeForUser
            });
        } catch (error) {
            console.error('Error fetching active avisos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener avisos activos',
                error: error.message
            });
        }
    }
};

module.exports = avisoController;

