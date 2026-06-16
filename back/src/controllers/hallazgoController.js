// IEEE Trace: REQ-003 | US-003 | controllers/hallazgoController.js
const { Hallazgo, RegistroActividad, Registro, User } = require('../database/models');

const hallazgoController = {
    // GET /api/hallazgos
    async index(req, res) {
        try {
            const { registro_id, registro_actividad_id } = req.query;
            const where = {};
            if (registro_id) where.registro_id = registro_id;
            if (registro_actividad_id) where.registro_actividad_id = registro_actividad_id;

            const hallazgos = await Hallazgo.findAll({
                where,
                include: [
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: RegistroActividad, as: 'registroActividad' }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: hallazgos });
        } catch (error) {
            console.error('Hallazgo index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener hallazgos' });
        }
    },

    // POST /api/hallazgos
    async store(req, res) {
        try {
            const { registro_id, registro_actividad_id, tipo, descripcion, accion_correctiva, fecha_limite } = req.body;
            
            if (!registro_id || !tipo || !descripcion) {
                return res.status(400).json({ success: false, message: 'Datos incompletos para crear hallazgo' });
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

            res.status(210).json({ success: true, data: hallazgo });
        } catch (error) {
            console.error('Hallazgo store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear hallazgo' });
        }
    },

    // GET /api/hallazgos/:id
    async show(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: Registro, as: 'registro' }
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

    // PUT /api/hallazgos/:id
    async update(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id);
            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            await hallazgo.update(req.body);
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

            await hallazgo.destroy();
            res.json({ success: true, message: 'Hallazgo eliminado' });
        } catch (error) {
            console.error('Hallazgo destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar hallazgo' });
        }
    }
};

module.exports = hallazgoController;
