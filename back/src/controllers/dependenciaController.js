// IEEE Trace: REQ-001 | Dependencia Controller
const { Dependencia, Vinculacion, Administracion } = require('../database/models');
const { Op } = require('sequelize');

const dependenciaController = {
    // GET /api/dependencias
    async index(req, res) {
        try {
            const { activo } = req.query;
            let where = {};
            if (activo !== undefined) {
                where.activo = activo;
            }

            // Scoping por rol: sin esto, cualquier usuario autenticado (incluido
            // contratista_user) veía el catálogo completo de dependencias/plantas de toda
            // la organización. admin/oval ven todo (gestión de configuración global).
            const { role, id: userId } = req.user;
            if (!['admin', 'oval'].includes(role)) {
                const vincWhere = { activo: 1 };
                if (role === 'administrador_contrato') {
                    const adminVincs = await Administracion.findAll({
                        where: { administrador_contrato_id: userId, activo: 1 },
                        attributes: ['vinculacion_id']
                    });
                    vincWhere.id = { [Op.in]: adminVincs.map(a => a.vinculacion_id) };
                } else if (role === 'contratista_admin') {
                    const cIds = [];
                    if (Array.isArray(req.user.contratista_ids) && req.user.contratista_ids.length > 0) {
                        cIds.push(...req.user.contratista_ids.map(Number));
                    }
                    if (req.user.contratista_id && !cIds.includes(Number(req.user.contratista_id))) {
                        cIds.push(Number(req.user.contratista_id));
                    }
                    vincWhere.contratista_id = { [Op.in]: cIds.length > 0 ? cIds : [-1] };
                } else if (role === 'contratista_user') {
                    vincWhere.id = req.user.vinculacion_id || -1;
                } else {
                    vincWhere.id = -1;
                }

                const scopedVincs = await Vinculacion.findAll({ where: vincWhere, attributes: ['dependencia_id'] });
                const scopedDependenciaIds = [...new Set(scopedVincs.map(v => v.dependencia_id))];
                if (scopedDependenciaIds.length === 0) return res.json({ success: true, data: [] });
                where.id = { [Op.in]: scopedDependenciaIds };
            }

            const dependencias = await Dependencia.findAll({
                where,
                order: [['nombre', 'ASC']]
            });
            res.json({ success: true, data: dependencias });
        } catch (error) {
            console.error('Dependencias index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener dependencias' });
        }
    },

    // GET /api/dependencias/:id
    async show(req, res) {
        try {
            const dependencia = await Dependencia.findByPk(req.params.id);
            if (!dependencia) {
                return res.status(404).json({ success: false, message: 'Dependencia no encontrada' });
            }
            res.json({ success: true, data: dependencia });
        } catch (error) {
            console.error('Dependencia show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener dependencia' });
        }
    },

    // POST /api/dependencias
    async store(req, res) {
        try {
            const { nombre, activo, nivel_faena } = req.body;
            if (!nombre) {
                return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
            }

            const dependencia = await Dependencia.create({
                nombre,
                activo: activo !== undefined ? activo : 1,
                nivel_faena
            });

            res.status(201).json({ success: true, data: dependencia });
        } catch (error) {
            console.error('Dependencia store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear dependencia' });
        }
    },

    // PUT /api/dependencias/:id
    async update(req, res) {
        try {
            const dependencia = await Dependencia.findByPk(req.params.id);
            if (!dependencia) {
                return res.status(404).json({ success: false, message: 'Dependencia no encontrada' });
            }

            const { nombre, activo, nivel_faena } = req.body;
            await dependencia.update({
                nombre: nombre || dependencia.nombre,
                activo: activo !== undefined ? activo : dependencia.activo,
                nivel_faena: nivel_faena !== undefined ? nivel_faena : dependencia.nivel_faena
            });

            res.json({ success: true, data: dependencia });
        } catch (error) {
            console.error('Dependencia update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar dependencia' });
        }
    },

    // DELETE /api/dependencias/:id
    async destroy(req, res) {
        try {
            const dependencia = await Dependencia.findByPk(req.params.id);
            if (!dependencia) {
                return res.status(404).json({ success: false, message: 'Dependencia no encontrada' });
            }

            // Soft delete or hard delete? Usually soft delete via 'activo' is preferred for ref integrity
            // But if user explicitly asks for delete, we might check for associations first.
            // For now, let's just set active = 0
            await dependencia.update({ activo: 0 });

            res.json({ success: true, message: 'Dependencia desactivada' });
        } catch (error) {
            console.error('Dependencia destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar dependencia' });
        }
    }
};

module.exports = dependenciaController;
