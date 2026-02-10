// IEEE Trace: REQ-001 | Servicio (TipoContratista) Controller
const { TipoContratista, Programa } = require('../database/models');

const servicioController = {
    // GET /api/servicios
    async index(req, res) {
        try {
            const { activo, programa_id } = req.query;
            let where = {};
            if (activo !== undefined) where.activo = activo;
            if (programa_id) where.programa_id = programa_id;

            const servicios = await TipoContratista.findAll({
                where,
                include: [{ model: Programa, as: 'programa', attributes: ['id', 'nombre'] }],
                order: [['nombre', 'ASC']]
            });
            res.json({ success: true, data: servicios });
        } catch (error) {
            console.error('Servicios index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener servicios' });
        }
    },

    // GET /api/servicios/:id
    async show(req, res) {
        try {
            const servicio = await TipoContratista.findByPk(req.params.id, {
                include: [{ model: Programa, as: 'programa', attributes: ['id', 'nombre'] }]
            });
            if (!servicio) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }
            res.json({ success: true, data: servicio });
        } catch (error) {
            console.error('Servicio show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener servicio' });
        }
    },

    // POST /api/servicios
    async store(req, res) {
        try {
            const { nombre, descripcion, programa_id, activo } = req.body;
            if (!nombre || !programa_id) {
                return res.status(400).json({ success: false, message: 'Nombre y Programa son obligatorios' });
            }

            const servicio = await TipoContratista.create({
                nombre,
                descripcion,
                programa_id,
                activo: activo !== undefined ? activo : 1
            });

            res.status(201).json({ success: true, data: servicio });
        } catch (error) {
            console.error('Servicio store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear servicio' });
        }
    },

    // PUT /api/servicios/:id
    async update(req, res) {
        try {
            const servicio = await TipoContratista.findByPk(req.params.id);
            if (!servicio) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }

            const { nombre, descripcion, programa_id, activo } = req.body;
            await servicio.update({
                nombre: nombre || servicio.nombre,
                descripcion: descripcion !== undefined ? descripcion : servicio.descripcion,
                programa_id: programa_id || servicio.programa_id,
                activo: activo !== undefined ? activo : servicio.activo
            });

            res.json({ success: true, data: servicio });
        } catch (error) {
            console.error('Servicio update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar servicio' });
        }
    },

    // DELETE /api/servicios/:id
    async destroy(req, res) {
        try {
            const servicio = await TipoContratista.findByPk(req.params.id);
            if (!servicio) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }

            await servicio.update({ activo: 0 });
            res.json({ success: true, message: 'Servicio desactivado' });
        } catch (error) {
            console.error('Servicio destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar servicio' });
        }
    }
};

module.exports = servicioController;
