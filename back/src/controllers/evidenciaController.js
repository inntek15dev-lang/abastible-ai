// IEEE Trace: REQ-005 | US-005 | evidenciaController.js
const path = require('path');
const fs = require('fs');
const { Evidencia, RegistroActividad, Registro, Actividad, Elemento } = require('../database/models');

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
                // Delete uploaded file if validation fails
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'registro_actividad_id es requerido'
                });
            }

            // Verify registro_actividad exists and fetch hierarchy
            // Verify registro_actividad exists and fetch hierarchy
            const registroActividad = await RegistroActividad.findByPk(registro_actividad_id, {
                include: [
                    { model: Registro, as: 'registro' },
                    {
                        model: Actividad,
                        as: 'actividad',
                        include: [{ model: Elemento, as: 'elemento' }]
                    }
                ]
            });
            // Note: Standard import at top is better. Let's assume standard import works.
            // But wait, 'Actividad' is not imported in original file. 'RegistroActividad' matches 'Actividad' via alias 'actividad'? 
            // Original code: const { Evidencia, RegistroActividad, Registro } = require('../database/models');
            // I need to make sure I can Include 'actividad'.

            if (!registroActividad) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({
                    success: false,
                    message: 'Actividad de registro no encontrada'
                });
            }

            // Check max evidencias
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

            // Construct new path: storage/registros/:rid/evidencias/Elemento :eid/Actividad :aid/
            // Sanitize names to be safe for file system
            const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            const regId = registroActividad.registro_id;
            const elemNum = registroActividad.actividad?.elemento?.numero || 'unknown';
            const actCod = registroActividad.actividad?.codigo || 'unknown';

            const storageRelativePath = path.join(
                'registros',
                String(regId),
                'evidencias',
                `elemento_${sanitize(String(elemNum))}`,
                `actividad_${sanitize(String(actCod))}`
            );

            const storageRoot = path.join(__dirname, '../../../storage');
            const targetDir = path.join(storageRoot, storageRelativePath);

            // Create recursive directory
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const targetPath = path.join(targetDir, req.file.filename);

            // Move file
            fs.renameSync(req.file.path, targetPath);

            // Save relative path for DB (normalized to forward slashes for URL compatibility)
            // We want 'storage/...' or just 'registros/...'?
            // If we serve /storage, then we need 'storage/registros/...'.
            // The file is physically at storage/registros/...
            // The download endpoint serves via express.static at /storage
            // So URL is /storage/registros/... 
            // Let's save 'storage/registros/...' 
            const dbPath = path.posix.join('storage', storageRelativePath.split(path.sep).join('/'), req.file.filename);

            const evidencia = await Evidencia.create({
                registro_actividad_id,
                user_id: req.user.id,
                nombre_original: req.file.originalname,
                nombre_archivo: req.file.filename,
                ruta: dbPath, // Saving logical path
                tipo_mime: req.file.mimetype,
                tamano_bytes: req.file.size,
                descripcion
            });

            res.status(201).json({ success: true, data: evidencia });
        } catch (error) {
            console.error('Evidencia store error:', error);
            if (req.file && fs.existsSync(req.file.path)) {
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
                // Fallback for old paths (absolute or relative to back)
                // New paths start with 'storage/' and are relative to project root (parent of back)
                // But wait, I saved 'storage/...' in DB.
                // Physically they are in ../storage/...
                // If I join __dirname (back/src/controllers) with ../../ + dbPath (storage/...)
                // it becomes back/storage/... which is wrong. It should be ../../ (back root) + ../ (project root) + dbPath?
                // No.
                // DB Path: storage/registros/...
                // Physical: c:/laragon/www/a-oiem-ai/storage/registros/...
                // __dirname: c:/laragon/www/a-oiem-ai/back/src/controllers
                // ../../ = back/
                // ../../../ = a-oiem-ai/

                const projectRoot = path.join(__dirname, '../../../');
                const absolutePath = path.join(projectRoot, evidencia.ruta);

                if (fs.existsSync(absolutePath)) {
                    return res.download(absolutePath, evidencia.nombre_original);
                }

                // Fallback: check if it's an old upload in 'uploads/evidencias' (relative to back root)
                // Old ruta was req.file.path (absolute path from multer)
                if (path.isAbsolute(evidencia.ruta) && fs.existsSync(evidencia.ruta)) {
                    return res.download(evidencia.ruta, evidencia.nombre_original);
                }

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
            // Try new path first
            const projectRoot = path.join(__dirname, '../../../');
            const absolutePath = path.join(projectRoot, evidencia.ruta);

            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            } else if (fs.existsSync(evidencia.ruta)) {
                // Try old path (absolute)
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
