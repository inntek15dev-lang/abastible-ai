// IEEE Trace: REQ-001 | US-001 | actividadController.js
const { Actividad, Elemento } = require('../database/models');

const actividadController = {
    // GET /api/actividades
    async index(req, res) {
        try {
            const { elemento_id } = req.query;
            const where = elemento_id ? { elemento_id } : {};

            const actividades = await Actividad.findAll({
                where,
                include: [{ model: Elemento, as: 'elemento' }],
                order: [['orden', 'ASC']]
            });

            res.json({ success: true, data: actividades });
        } catch (error) {
            console.error('Actividades index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener actividades' });
        }
    },

    // POST /api/actividades
    async store(req, res) {
        try {
            const { elemento_id, codigo, actividad, descripcion, criterios, frecuencia, requiere_evidencia = 1, orden = 0 } = req.body;

            if (!elemento_id || !codigo || !actividad || !descripcion) {
                return res.status(400).json({
                    success: false,
                    message: 'elemento_id, codigo, actividad y descripcion son requeridos'
                });
            }

            const nuevaActividad = await Actividad.create({
                elemento_id, codigo, actividad, descripcion, criterios, frecuencia, requiere_evidencia, orden
            });

            res.status(201).json({ success: true, data: nuevaActividad });
        } catch (error) {
            console.error('Actividad store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear actividad' });
        }
    },

    // PUT /api/actividades/:id
    async update(req, res) {
        try {
            const actividad = await Actividad.findByPk(req.params.id);
            if (!actividad) {
                return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
            }

            await actividad.update(req.body);
            res.json({ success: true, data: actividad });
        } catch (error) {
            console.error('Actividad update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar actividad' });
        }
    },

    // DELETE /api/actividades/:id
    async destroy(req, res) {
        try {
            const actividad = await Actividad.findByPk(req.params.id);
            if (!actividad) {
                return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
            }

            await actividad.destroy();
            res.json({ success: true, message: 'Actividad eliminada' });
        } catch (error) {
            console.error('Actividad destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar actividad' });
        }
    }
};

module.exports = actividadController;
