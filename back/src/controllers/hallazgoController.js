// IEEE Trace: REQ-003 | US-003 | hallazgoController.js
const { Hallazgo, Registro, RegistroActividad, User, Compromiso } = require('../database/models');

const hallazgoController = {
    // GET /api/hallazgos
    async index(req, res) {
        try {
            const { registro_id, estado } = req.query;
            let where = {};

            if (registro_id) where.registro_id = registro_id;
            if (estado) where.estado = estado;

            const hallazgos = await Hallazgo.findAll({
                where,
                include: [
                    { model: Registro, as: 'registro', attributes: ['id', 'periodo', 'eecc_nombre'] },
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: RegistroActividad, as: 'registroActividad' },
                    { model: Compromiso, as: 'compromisos' } // Sprint 2
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: hallazgos });
        } catch (error) {
            console.error('Hallazgos index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener hallazgos' });
        }
    },

    // GET /api/hallazgos/:id
    async show(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id, {
                include: [
                    { model: Registro, as: 'registro' },
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: RegistroActividad, as: 'registroActividad' },
                    { model: Compromiso, as: 'compromisos' }
                ]
            });

            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            res.json({ success: true, data: hallazgo });
        } catch (error) {
            console.error('Hallazgo show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener hallazgo' });
        }
    },

    // POST /api/hallazgos
    async store(req, res) {
        try {
            const {
                registro_id,
                registro_actividad_id,
                tipo = 'observacion',
                descripcion,
                accion_correctiva,
                fecha_limite
            } = req.body;

            if (!registro_id || !descripcion) {
                return res.status(400).json({
                    success: false,
                    message: 'registro_id y descripcion son requeridos'
                });
            }

            const hallazgo = await Hallazgo.create({
                registro_id,
                registro_actividad_id,
                auditor_id: req.user.id,
                tipo,
                descripcion,
                accion_correctiva,
                fecha_limite,
                estado: 'abierto'
            });

            res.status(201).json({ success: true, data: hallazgo });
        } catch (error) {
            console.error('Hallazgo store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear hallazgo' });
        }
    },

    // PUT /api/hallazgos/:id
    async update(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id);

            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            const updateData = { ...req.body };

            // If closing, set close date
            if (updateData.estado === 'cerrado' && hallazgo.estado !== 'cerrado') {
                updateData.fecha_cierre = new Date();
            }

            await hallazgo.update(updateData);

            res.json({ success: true, data: hallazgo });
        } catch (error) {
            console.error('Hallazgo update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar hallazgo' });
        }
    },

    // DELETE /api/hallazgos/:id
    async destroy(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id);

            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            // Optional: Block delete if closed? 
            // if (hallazgo.estado === 'cerrado') {
            //     return res.status(400).json({ success: false, message: 'No se puede eliminar un hallazgo cerrado' });
            // }

            await hallazgo.destroy();

            res.json({ success: true, message: 'Hallazgo eliminado' });
        } catch (error) {
            console.error('Hallazgo destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar hallazgo' });
        }
    }
};

module.exports = hallazgoController;
