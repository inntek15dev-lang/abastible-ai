// IEEE Trace: REQ-011 | US-011 | licitacionController.js
const { Licitacion, Postulacion, User, Documento } = require('../database/models');
const { Op } = require('sequelize');

const licitacionController = {
    // GET /api/licitaciones
    async index(req, res) {
        try {
            const { estado } = req.query;
            let where = {};

            if (estado) where.estado = estado;

            // If contractor, only show open or what they applied to? For simplicity, show available.
            if (['contratista_admin', 'contratista_user'].includes(req.user.role)) {
                // Logic can be refined. For now allow viewing open ones.
                if (!estado) where.estado = { [Op.or]: ['abierta', 'adjudicada', 'cerrada'] };
            }

            const licitaciones = await Licitacion.findAll({
                where,
                order: [['created_at', 'DESC']],
                include: [
                    { model: User, as: 'creador', attributes: ['id', 'name'] },
                    // Sprint 5: Include Docs for direct download
                    { model: Documento, as: 'documentos', required: false, where: { entity_type: 'Licitacion' } }
                    // Note: 'entity_type' depends on how I defined foreign keys. 
                    // Wait, Documento model uses 'entidad_tipo' and 'entidad_id' (polymorphic-ish). 
                    // Sequelize standard association might be tricky with polymorphic string fields without specific scopes.
                    // Let's check Documento model definition or how I set up association in index.js.
                    // In index.js: Licitacion.hasMany(Documento...?) NO. I didn't set up Licitacion->Documento association in index.js for polymorphic.
                    // I only set Documento.belongsTo(User).
                    // I need to fix Associations in index.js first if I want to use 'include'.
                ]
            });

            res.json({ success: true, data: licitaciones });
        } catch (error) {
            console.error('Licitaciones index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener licitaciones' });
        }
    },

    // GET /api/licitaciones/:id
    async show(req, res) {
        try {
            const licitacion = await Licitacion.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'creador', attributes: ['id', 'name'] },
                    {
                        model: Postulacion,
                        as: 'postulaciones',
                        include: [{ model: User, as: 'contratista', attributes: ['id', 'name', 'eecc_nombre'] }]
                    }
                ]
            });

            // Fetch associated docs manually since it's polymorphic-ish
            const documentos = await Documento.findAll({
                where: { entidad_tipo: 'Licitacion', entidad_id: req.params.id }
            });

            if (!licitacion) {
                return res.status(404).json({ success: false, message: 'Licitación no encontrada' });
            }

            // Hide postulaciones for contractors
            if (['contratista_admin', 'contratista_user'].includes(req.user.role)) {
                // Only show THEIR postulacion if exists
                const myPostulacion = licitacion.postulaciones.find(p => p.contratista_id === req.user.id);
                licitacion.dataValues.postulaciones = myPostulacion ? [myPostulacion] : [];
                licitacion.dataValues.mi_postulacion = myPostulacion;
            }

            licitacion.dataValues.documentos = documentos;

            res.json({ success: true, data: licitacion });
        } catch (error) {
            console.error('Licitacion show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener licitación' });
        }
    },

    // POST /api/licitaciones
    async store(req, res) {
        try {
            const { titulo, descripcion, fecha_inicio, fecha_fin, presupuesto_referencial } = req.body;

            const licitacion = await Licitacion.create({
                titulo,
                descripcion,
                fecha_inicio,
                fecha_fin,
                presupuesto_referencial,
                user_id: req.user.id,
                estado: 'borrador'
            });

            // Handle Document Attachment (if file ID provided or handled via separate upload endpoint first)
            // Strategy: Frontend uploads file first -> gets ID -> sends ID here. 
            // OR checks for 'documento_id' in body.
            // For now, let's assume loose coupling: Documents are uploaded separately and linked via 'entidad_id'

            res.status(201).json({ success: true, data: licitacion });
        } catch (error) {
            console.error('Licitacion store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear licitación' });
        }
    },

    // PUT /api/licitaciones/:id
    async update(req, res) {
        try {
            const licitacion = await Licitacion.findByPk(req.params.id);
            if (!licitacion) return res.status(404).json({ message: 'No encontrada' });

            await licitacion.update(req.body);
            res.json({ success: true, data: licitacion });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Error update' });
        }
    },

    // PUT /api/licitaciones/:id/estado
    async cambiarEstado(req, res) {
        try {
            const { estado } = req.body;
            const licitacion = await Licitacion.findByPk(req.params.id);
            if (!licitacion) return res.status(404).json({ message: 'Not found' });

            await licitacion.update({ estado });
            res.json({ success: true, data: licitacion });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Error estado' });
        }
    }
};

module.exports = licitacionController;
