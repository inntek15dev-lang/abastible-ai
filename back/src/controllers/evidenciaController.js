// IEEE Trace: REQ-005 | US-005 | evidenciaController.js
const path = require('path');
const fs = require('fs');
const { Evidencia, RegistroActividad, Registro } = require('../database/models');

const evidenciaController = {
    // GET /api/evidencias?registro_actividad_id=X
    async index(req, res) {
        try {
            const { registro_actividad_id, registro_id } = req.query;
            let where = {};

            if (registro_actividad_id) {
                where.registro_actividad_id = registro_actividad_id;
            }

            const evidencias = await Evidencia.findAll({
                where,
                include: [
                    {
                        model: RegistroActividad,
                        as: 'registroActividad',
                        where: registro_id ? { registro_id } : undefined
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: evidencias });
        } catch (error) {
            console.error('Evidencias index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener evidencias' });
        }
    },

    // POST /api/evidencias (multipart/form-data)
    async store(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
            }

            const { registro_actividad_id, descripcion } = req.body;

            if (!registro_actividad_id) {
                return res.status(400).json({
                    success: false,
                    message: 'registro_actividad_id es requerido'
                });
            }

            // Verify registro_actividad exists
            const registroActividad = await RegistroActividad.findByPk(registro_actividad_id, {
                include: [{ model: Registro, as: 'registro' }]
            });

            if (!registroActividad) {
                // Delete uploaded file
                fs.unlinkSync(req.file.path);
                return res.status(404).json({
                    success: false,
                    message: 'Actividad de registro no encontrada'
                });
            }

            // Check max evidencias (from configuracion: max 4)
            const existingCount = await Evidencia.count({
                where: { registro_actividad_id }
            });

            if (existingCount >= 4) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Máximo de 4 evidencias por actividad alcanzado'
                });
            }

            const evidencia = await Evidencia.create({
                registro_actividad_id,
                user_id: req.user.id,
                nombre_original: req.file.originalname,
                nombre_archivo: req.file.filename,
                ruta: req.file.path,
                tipo_mime: req.file.mimetype,
                tamano_bytes: req.file.size,
                descripcion
            });

            res.status(201).json({ success: true, data: evidencia });
        } catch (error) {
            console.error('Evidencia store error:', error);
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ success: false, message: 'Error al subir evidencia' });
        }
    },

    // GET /api/evidencias/:id/download
    async download(req, res) {
        try {
            const evidencia = await Evidencia.findByPk(req.params.id);

            if (!evidencia) {
                return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
            }

            if (!fs.existsSync(evidencia.ruta)) {
                return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
            }

            res.download(evidencia.ruta, evidencia.nombre_original);
        } catch (error) {
            console.error('Evidencia download error:', error);
            res.status(500).json({ success: false, message: 'Error al descargar' });
        }
    },

    // DELETE /api/evidencias/:id
    async destroy(req, res) {
        try {
            const evidencia = await Evidencia.findByPk(req.params.id);

            if (!evidencia) {
                return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
            }

            // Delete file
            if (fs.existsSync(evidencia.ruta)) {
                fs.unlinkSync(evidencia.ruta);
            }

            await evidencia.destroy();

            res.json({ success: true, message: 'Evidencia eliminada' });
        } catch (error) {
            console.error('Evidencia destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar evidencia' });
        }
    }
};

module.exports = evidenciaController;
