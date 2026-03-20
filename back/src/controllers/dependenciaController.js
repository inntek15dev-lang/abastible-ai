// IEEE Trace: REQ-001 | Dependencia Controller
const { Dependencia } = require('../database/models');

const dependenciaController = {
    // GET /api/dependencias
    async index(req, res) {
        try {
            const { activo } = req.query;
            let where = {};
            if (activo !== undefined) {
                where.activo = activo;
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
