// IEEE Trace: US-012, US-013 | postulacionController.js
const { Postulacion, Licitacion, User, Documento } = require('../database/models');

const postulacionController = {
    // POST /api/licitaciones/:id/postular
    async postular(req, res) {
        try {
            const { oferta_economica, oferta_tecnica, documento_id } = req.body;
            const licitacionId = req.params.id;
            const userId = req.user.id;

            // Check if licitacion exists and is open
            const licitacion = await Licitacion.findByPk(licitacionId);
            if (!licitacion) return res.status(404).json({ message: 'Licitación no encontrada' });
            if (licitacion.estado !== 'abierta') return res.status(400).json({ message: 'Licitación no está abierta' });

            // Check if already applied
            const existing = await Postulacion.findOne({
                where: { licitacion_id: licitacionId, contratista_id: userId }
            });
            if (existing) return res.status(400).json({ message: 'Ya has postulado a esta licitación' });

            const postulacion = await Postulacion.create({
                licitacion_id: licitacionId,
                contratista_id: userId,
                oferta_economica,
                oferta_tecnica: oferta_tecnica || 'Propuesta estándar',
                estado: 'enviada'
            });

            // Link upload if provided
            if (documento_id) {
                const doc = await Documento.findByPk(documento_id);
                if (doc && doc.user_id === userId) {
                    await doc.update({ entidad_tipo: 'Postulacion', entidad_id: postulacion.id });
                }
            }

            res.status(201).json({ success: true, data: postulacion });
        } catch (error) {
            console.error('Postular error:', error);
            res.status(500).json({ success: false, message: 'Error al postular' });
        }
    },

    // GET /api/mis-postulaciones
    async misPostulaciones(req, res) {
        try {
            const where = {};

            // RBAC: Strict filter
            if (['contratista_admin', 'contratista_user'].includes(req.user.role)) {
                where.contratista_id = req.user.id;
            } else if (['admin', 'administrador_contrato'].includes(req.user.role)) {
                // Admin can see all, or filter by specific contractor if needed
                // For now, return all for admins to manage
            }

            const postulaciones = await Postulacion.findAll({
                where,
                include: [
                    { model: Licitacion, as: 'licitacion', attributes: ['titulo', 'estado', 'fecha_fin'] },
                    { model: User, as: 'contratista', attributes: ['name', 'eecc_nombre'] }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: postulaciones });
        } catch (error) {
            console.error('Mis Postulaciones error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener postulaciones' });
        }
    }
};

module.exports = postulacionController;
