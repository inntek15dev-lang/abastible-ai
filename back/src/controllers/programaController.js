// IEEE Trace: REQ-001 | US-001 | programaController.js
const { Programa, Elemento, Actividad } = require('../database/models');

const programaController = {
    // GET /api/programas
    async index(req, res) {
        try {
            const { role, id, contratista_id } = req.user;

            // Initial scoping includes (Step 1 - minimal)
            let includeScoping = [];

            if (role === 'administrador_contrato') {
                const { TipoContratista, Vinculacion, Administracion } = require('../database/models');
                includeScoping.push({
                    model: TipoContratista,
                    as: 'tiposContratista',
                    attributes: [],
                    required: true,
                    include: [{
                        model: Vinculacion,
                        as: 'vinculaciones',
                        attributes: [],
                        required: true,
                        include: [{
                            model: Administracion,
                            as: 'administraciones',
                            attributes: [],
                            where: { administrador_contrato_id: id, activo: 1 },
                            required: true
                        }]
                    }]
                });
            } else if (role === 'contratista_admin') {
                const { TipoContratista, Vinculacion } = require('../database/models');
                const { Op } = require('sequelize');
                const cIds = req.user.contratista_ids || (contratista_id ? [contratista_id] : (req.user.contratista_id ? [req.user.contratista_id] : []));
                includeScoping.push({
                    model: TipoContratista,
                    as: 'tiposContratista',
                    attributes: [],
                    required: true,
                    include: [{
                        model: Vinculacion,
                        as: 'vinculaciones',
                        attributes: [],
                        where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                        required: true
                    }]
                });
            } else if (role === 'contratista_user') {
                const { TipoContratista } = require('../database/models');
                const tcId = req.user.tipo_contratista_id;

                if (tcId) {
                    includeScoping.push({
                        model: TipoContratista,
                        as: 'tiposContratista',
                        attributes: [],
                        where: { id: tcId },
                        required: true
                    });
                } else {
                    return res.json({ success: true, data: [] });
                }
            }

            // Step 1: Get scoped program IDs
            const scopedProgramas = await Programa.findAll({
                attributes: ['id'],
                include: includeScoping,
                group: ['Programa.id']
            });

            const programIds = scopedProgramas.map(p => p.id);

            if (programIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

            // Step 2: Get full data for those IDs
            const programas = await Programa.findAll({
                where: { id: programIds },
                include: [{
                    model: Elemento,
                    as: 'elementos',
                    include: [{
                        model: Actividad,
                        as: 'actividades'
                    }]
                }],
                order: [['id', 'ASC'], ['elementos', 'orden', 'ASC']]
            });

            res.json({
                success: true,
                data: programas
            });
        } catch (error) {
            console.error('Programas index error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener programas'
            });
        }
    },

    // GET /api/programas/:id
    async show(req, res) {
        try {
            const programa = await Programa.findByPk(req.params.id, {
                include: [{
                    model: Elemento,
                    as: 'elementos',
                    include: [{
                        model: Actividad,
                        as: 'actividades'
                    }]
                }]
            });

            if (!programa) {
                return res.status(404).json({
                    success: false,
                    message: 'Programa no encontrado'
                });
            }

            res.json({
                success: true,
                data: programa
            });
        } catch (error) {
            console.error('Programa show error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener programa'
            });
        }
    },

    // POST /api/programas
    async store(req, res) {
        try {
            const { nombre, descripcion, meta_cumplimiento = 100, activo = 1 } = req.body;

            if (!nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre es requerido'
                });
            }

            const programa = await Programa.create({
                nombre,
                descripcion,
                meta_cumplimiento,
                activo
            });

            // Automatically create a directory for its evidence templates
            const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const programSlug = sanitize(nombre);
            const path = require('path');
            const fs = require('fs');
            const templatesDir = path.join(__dirname, '../../../storage/templates_evidencia', programSlug);
            if (!fs.existsSync(templatesDir)) {
                fs.mkdirSync(templatesDir, { recursive: true });
            }

            res.status(201).json({
                success: true,
                data: programa,
                message: 'Programa creado exitosamente'
            });
        } catch (error) {
            console.error('Programa store error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear programa'
            });
        }
    },

    // PUT /api/programas/:id
    async update(req, res) {
        try {
            const programa = await Programa.findByPk(req.params.id);

            if (!programa) {
                return res.status(404).json({
                    success: false,
                    message: 'Programa no encontrado'
                });
            }

            const { nombre, descripcion, meta_cumplimiento, activo } = req.body;

            await programa.update({
                nombre: nombre ?? programa.nombre,
                descripcion: descripcion ?? programa.descripcion,
                meta_cumplimiento: meta_cumplimiento ?? programa.meta_cumplimiento,
                activo: activo ?? programa.activo
            });

            res.json({
                success: true,
                data: programa,
                message: 'Programa actualizado exitosamente'
            });
        } catch (error) {
            console.error('Programa update error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar programa'
            });
        }
    },

    // DELETE /api/programas/:id
    async destroy(req, res) {
        try {
            const programa = await Programa.findByPk(req.params.id);

            if (!programa) {
                return res.status(404).json({
                    success: false,
                    message: 'Programa no encontrado'
                });
            }

            await programa.destroy();

            res.json({
                success: true,
                message: 'Programa eliminado exitosamente'
            });
        } catch (error) {
            console.error('Programa destroy error:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar programa'
            });
        }
    }
};

module.exports = programaController;
