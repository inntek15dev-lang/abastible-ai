// IEEE Trace: US-013 | Documento Controller - Download Logic
const { Documento, User } = require('../database/models');
const path = require('path');
const fs = require('fs');

const documentoController = {
    // POST /api/documentos (General Upload)
    async upload(req, res) {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        try {
            const { label, entidad_tipo, entidad_id } = req.body;
            const doc = await Documento.create({
                user_id: req.user.id,
                nombre_archivo: req.file.originalname,
                ruta_archivo: req.file.filename,
                mime_type: req.file.mimetype,
                size: req.file.size,
                label: label || req.file.originalname,
                entidad_tipo: entidad_tipo || null,
                entidad_id: entidad_id || null
            });
            res.status(201).json({ success: true, data: doc });
        } catch (error) {
            console.error('Doc Upload Error:', error);
            res.status(500).json({ success: false, message: 'Upload Failed' });
        }
    },

    // GET /api/documentos
    async index(req, res) {
        try {
            const docs = await Documento.findAll({
                where: { user_id: req.user.id } // Basic filtering by user
            });
            res.json(docs);
        } catch (error) {
            console.error('List Docs Error:', error);
            res.status(500).json({ message: 'Error al listar documentos' });
        }
    },

    // GET /api/documentos/:id/download
    async download(req, res) {
        try {
            const doc = await Documento.findByPk(req.params.id);
            if (!doc) return res.status(404).json({ message: 'Documento no encontrado' });

            // File Path
            // Assuming uploads are stored in 'back/uploads' relative to server execution
            // Adjust logic based on where 'uploads' folder is created by middleware
            // Based on middleware, it's `../../uploads` relative to middleware file.
            // Middleware is in `back/src/middleware/uploadMiddleware.js`, so uploads is `back/uploads`.
            // Controller is in `back/src/controllers/documentoController.js`.
            // So relative path from controller is also `../../uploads`.

            const filePath = path.join(__dirname, '../../uploads', doc.ruta_archivo);

            if (fs.existsSync(filePath)) {
                res.download(filePath, doc.nombre_archivo);
            } else {
                res.status(404).json({ message: 'Archivo físico no disponible' });
            }
        } catch (error) {
            console.error('Download Error:', error);
            res.status(500).json({ message: 'Error de descarga' });
        }
    }
};

module.exports = documentoController;
