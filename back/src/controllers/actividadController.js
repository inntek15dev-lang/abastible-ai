// IEEE Trace: REQ-001 | US-001 | actividadController.js
const { Actividad, Elemento } = require('../database/models');
const fs = require('fs');
const path = require('path');
const { safeMove } = require('../utils/fileHelper');

const actividadController = {
    // GET /api/actividades
    async index(req, res) {
        try {
            const { elemento_id, programa_id } = req.query;
            const where = elemento_id ? { elemento_id } : {};

            const elementoWhere = {};
            if (programa_id) elementoWhere.programa_id = programa_id;

            const actividades = await Actividad.findAll({
                where,
                include: [{ model: Elemento, as: 'elemento', where: Object.keys(elementoWhere).length ? elementoWhere : undefined, required: !!programa_id }],
                order: [['orden', 'ASC']]
            });

            res.json({ success: true, data: actividades });
        } catch (error) {
            console.error('Actividades index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener actividades' });
        }
    },

    // POST /api/actividades
    async store(req, res) {
        try {
            let { elemento_id, codigo, actividad, descripcion, criterios, frecuencia, requiere_evidencia = 1, orden = 0 } = req.body;

            // Validate and default frequency
            const validFrecuencias = ['mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique'];
            if (!frecuencia || !validFrecuencias.includes(frecuencia)) {
                frecuencia = 'mensual';
            }

            if (!elemento_id || !codigo || !actividad || !descripcion) {
                // Cleanup upload if valid failed
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'elemento_id, codigo, actividad y descripcion son requeridos'
                });
            }

            let template_url = null;
            if (req.file) {
                // Fetch Elemento to get Program ID and Number
                const elemento = await Elemento.findByPk(elemento_id);
                if (!elemento) {
                    fs.unlinkSync(req.file.path);
                    return res.status(404).json({ success: false, message: 'Elemento no encontrado' });
                }

                               const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const { Programa } = require('../database/models');
                const programa = await Programa.findByPk(elemento.programa_id);
                const programName = programa ? programa.nombre : `programa_${elemento.programa_id}`;
                const programSlug = sanitize(programName);

                const storageRelativePath = path.join(
                    'templates_evidencia',
                    programSlug
                );

                const storageRoot = path.join(__dirname, '../../../storage');
                const targetDir = path.join(storageRoot, storageRelativePath);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const targetPath = path.join(targetDir, req.file.filename);
                safeMove(req.file.path, targetPath);

                // URL for frontend: storage/templates_evidencia/...
                template_url = path.posix.join('storage', storageRelativePath.split(path.sep).join('/'), req.file.filename);
            }

            const nuevaActividad = await Actividad.create({
                elemento_id, codigo, actividad, descripcion, criterios, frecuencia, requiere_evidencia, orden, template_url
            });

            res.status(201).json({ success: true, data: nuevaActividad });
        } catch (error) {
            console.error('Actividad store error:', error);
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ success: false, message: 'Error al crear actividad' });
        }
    },

    // PUT /api/actividades/:id
    async update(req, res) {
        try {
            const actividad = await Actividad.findByPk(req.params.id, {
                include: [{ model: Elemento, as: 'elemento' }]
            });
            if (!actividad) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
            }

            const updateData = { ...req.body };

            // Validate and default frequency if present
            if (updateData.frecuencia !== undefined) {
                const validFrecuencias = ['mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique'];
                if (!updateData.frecuencia || !validFrecuencias.includes(updateData.frecuencia)) {
                    updateData.frecuencia = 'mensual';
                }
            }

            if (req.file) {
                // Logic similar to store
                // We use existing element info attached to activity
                const elemento = actividad.elemento; // Should be loaded
                // Wait, if element_id is changed in body, we need to fetch new element?
                // Usually activity stays in element. If changed, we should use new element.

                let targetElement = elemento;
                if (req.body.elemento_id && req.body.elemento_id != actividad.elemento_id) {
                    targetElement = await Elemento.findByPk(req.body.elemento_id);
                }

                if (!targetElement) {
                    fs.unlinkSync(req.file.path);
                    return res.status(404).json({ success: false, message: 'Elemento destino no encontrado' });
                }

                const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const { Programa } = require('../database/models');
                const programa = await Programa.findByPk(targetElement.programa_id);
                const programName = programa ? programa.nombre : `programa_${targetElement.programa_id}`;
                const programSlug = sanitize(programName);

                const storageRelativePath = path.join(
                    'templates_evidencia',
                    programSlug
                );

                const storageRoot = path.join(__dirname, '../../../storage');
                const targetDir = path.join(storageRoot, storageRelativePath);

                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const targetPath = path.join(targetDir, req.file.filename);
                safeMove(req.file.path, targetPath);

                // Remove old template if exists? Maybe. For now, just setting new one.
                updateData.template_url = path.posix.join('storage', storageRelativePath.split(path.sep).join('/'), req.file.filename);
            }

            await actividad.update(updateData);
            res.json({ success: true, data: actividad });
        } catch (error) {
            console.error('Actividad update error:', error);
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ success: false, message: 'Error al actualizar actividad' });
        }
    },

    // DELETE /api/actividades/:id
    async destroy(req, res) {
        try {
            const actividad = await Actividad.findByPk(req.params.id);
            if (!actividad) {
                return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
            }

            await actividad.destroy();
            res.json({ success: true, message: 'Actividad eliminada' });
        } catch (error) {
            console.error('Actividad destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar actividad' });
        }
    }
};

module.exports = actividadController;
