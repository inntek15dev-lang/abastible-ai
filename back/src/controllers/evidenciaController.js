// IEEE Trace: REQ-005 | US-005 | evidenciaController.js
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { Evidencia, RegistroActividad, Registro, Actividad, Elemento, Vinculacion, Contratista } = require('../database/models');
const { Op } = require('sequelize');
const { safeMove } = require('../utils/fileHelper');

const evidenciaController = {
    // GET /api/evidencias?registro_actividad_id=X
    async index(req, res) {
        try {
            const { registro_actividad_id, registro_id, periodo, contratista_id, programa_id, elemento_id, actividad_id, status_filter } = req.query;
            let where = {};
            let whereRegistro = {};
            let whereRegistroActividad = {};

            if (status_filter === 'pending') {
                whereRegistro.estado_auditoria = { [Op.in]: ['pendiente', 'auditando', 'subsanado', 'en_revision'] };
                whereRegistroActividad.cumple_auditor = null;
            }

            if (registro_actividad_id) where.registro_actividad_id = registro_actividad_id;
            if (actividad_id) whereRegistroActividad.actividad_id = actividad_id;

            if (registro_id) whereRegistro.id = registro_id;
            if (periodo) whereRegistro.periodo = periodo;
            if (programa_id) whereRegistro.programa_id = programa_id;

            const evidencias = await Evidencia.findAll({
                where,
                include: [
                    {
                        model: RegistroActividad,
                        as: 'registroActividad',
                        where: Object.keys(whereRegistroActividad).length > 0 ? whereRegistroActividad : undefined,
                        required: (registro_id || periodo || programa_id || contratista_id || elemento_id || actividad_id) ? true : false,
                        include: [
                            {
                                model: Actividad,
                                as: 'actividad',
                                required: (elemento_id) ? true : false,
                                where: elemento_id ? { elemento_id } : undefined,
                                include: [{ model: Elemento, as: 'elemento' }]
                            },
                            {
                                model: Registro,
                                as: 'registro',
                                where: Object.keys(whereRegistro).length > 0 ? whereRegistro : undefined,
                                required: (contratista_id) ? true : false,
                                include: contratista_id ? [
                                    {
                                        model: Vinculacion,
                                        as: 'vinculacionEntidad',
                                        where: { contratista_id },
                                        required: true
                                    }
                                ] : []
                            }
                        ]
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

    // GET /api/evidencias/bulk-download
    async downloadSelected(req, res) {
        try {
            const { periodo, contratista_id, programa_id, elemento_id, actividad_id } = req.query;
            let whereRegistro = {};
            let whereRegistroActividad = {};

            if (periodo) whereRegistro.periodo = periodo;
            if (programa_id) whereRegistro.programa_id = programa_id;
            if (actividad_id) whereRegistroActividad.actividad_id = actividad_id;

            const evidencias = await Evidencia.findAll({
                include: [
                    {
                        model: RegistroActividad,
                        as: 'registroActividad',
                        required: true,
                        where: Object.keys(whereRegistroActividad).length > 0 ? whereRegistroActividad : undefined,
                        include: [
                            {
                                model: Actividad,
                                as: 'actividad',
                                required: (elemento_id) ? true : false,
                                where: elemento_id ? { elemento_id } : undefined
                            },
                            {
                                model: Registro,
                                as: 'registro',
                                where: Object.keys(whereRegistro).length > 0 ? whereRegistro : undefined,
                                required: true,
                                include: contratista_id ? [
                                    {
                                        model: Vinculacion,
                                        as: 'vinculacionEntidad',
                                        where: { contratista_id },
                                        required: true
                                    }
                                ] : []
                            }
                        ]
                    }
                ]
            });

            if (evidencias.length === 0) {
                return res.status(404).json({ success: false, message: 'No se encontraron evidencias con los criterios seleccionados' });
            }

            const archive = archiver('zip', { zlib: { level: 9 } });
            res.attachment(`evidencias_${periodo || 'periodo'}_${contratista_id || 'todas'}.zip`);

            archive.pipe(res);

            const projectRoot = path.join(__dirname, '../../../');

            evidencias.forEach(e => {
                const absPath = path.join(projectRoot, e.ruta);
                if (fs.existsSync(absPath)) {
                    // Create a folder structure inside the zip: Periodo/Contratista/Elemento/Actividad/Archivo
                    const subDir = e.registroActividad?.registro?.periodo || 'sin_periodo';
                    const fileNameInZip = `${subDir}/${e.nombre_archivo}`;
                    archive.file(absPath, { name: fileNameInZip });
                }
            });

            await archive.finalize();

        } catch (error) {
            console.error('Bulk download error:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Error al generar descarga masiva' });
            }
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
            safeMove(req.file.path, targetPath);

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
