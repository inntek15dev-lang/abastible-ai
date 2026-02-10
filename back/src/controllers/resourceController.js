// IEEE Trace: US-006 | resourceController.js
const { Dependencia, TipoContratista } = require('../database/models');

const resourceController = {
    // GET /api/resources/dependencias
    async dependencias(req, res) {
        try {
            const data = await Dependencia.findAll({
                attributes: ['id', 'nombre'],
                order: [['nombre', 'ASC']]
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching dependencias:', error);
            res.status(500).json({ success: false, message: 'Error al obtener dependencias' });
        }
    },

    // GET /api/resources/tipos-contratista
    async tiposContratista(req, res) {
        try {
            const data = await TipoContratista.findAll({
                attributes: ['id', 'nombre'],
                order: [['nombre', 'ASC']]
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching tipos contratista:', error);
            res.status(500).json({ success: false, message: 'Error al obtener tipos de contratista' });
        }
    }
};

module.exports = resourceController;
