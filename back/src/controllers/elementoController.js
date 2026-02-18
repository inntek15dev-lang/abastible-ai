// IEEE Trace: REQ-001 | US-001 | elementoController.js
const { Elemento, Programa, Actividad } = require('../database/models');

const elementoController = {
    // GET /api/elementos
    async index(req, res) {
        try {
            const { programa_id } = req.query;
            const where = programa_id ? { programa_id } : {};

            const elementos = await Elemento.findAll({
                where,
                include: [
                    { model: Programa, as: 'programa' },
                    { model: Actividad, as: 'actividades' }
                ],
                order: [['orden', 'ASC']]
            });

            res.json({ success: true, data: elementos });
        } catch (error) {
            console.error('Elementos index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener elementos' });
        }
    },

    // GET /api/elementos/:id
    async show(req, res) {
        try {
            const elemento = await Elemento.findByPk(req.params.id, {
                include: [
                    { model: Programa, as: 'programa' },
                    { model: Actividad, as: 'actividades' }
                ]
            });

            if (!elemento) {
                return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
            }

            res.json({ success: true, data: elemento });
        } catch (error) {
            console.error('Elemento show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener elemento' });
        }
    },

    // POST /api/elementos
    async store(req, res) {
        try {
            const { programa_id, numero, nombre, descripcion, orden = 0 } = req.body;

            if (!programa_id || !numero || !nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'programa_id, numero y nombre son requeridos'
                });
            }

            const elemento = await Elemento.create({
                programa_id, numero, nombre, descripcion, orden
            });

            res.status(201).json({ success: true, data: elemento });
        } catch (error) {
            console.error('Elemento store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear elemento' });
        }
    },

    // PUT /api/elementos/:id
    async update(req, res) {
        try {
            const elemento = await Elemento.findByPk(req.params.id);
            if (!elemento) {
                return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
            }

            await elemento.update(req.body);
            res.json({ success: true, data: elemento });
        } catch (error) {
            console.error('Elemento update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar elemento' });
        }
    },

    // DELETE /api/elementos/:id
    async destroy(req, res) {
        try {
            const elemento = await Elemento.findByPk(req.params.id);
            if (!elemento) {
                return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
            }

            await elemento.destroy();
            res.json({ success: true, message: 'Elemento eliminado' });
        } catch (error) {
            console.error('Elemento destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar elemento' });
        }
    }
};

module.exports = elementoController;
