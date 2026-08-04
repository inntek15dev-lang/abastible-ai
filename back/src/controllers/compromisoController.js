const { Compromiso, Hallazgo, Registro, User, Vinculacion } = require('../database/models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { safeMove } = require('../utils/fileHelper');
const { getAllowedVinculacionIds, isRegistroInScope } = require('../utils/scopeHelper');

const compromisoController = {
    // GET /api/compromisos
    async index(req, res) {
        try {
            const { registro_id, hallazgo_id, estado, responsable_id, contratista_id, servicio_id, dependencia_id } = req.query;
            let where = {};

            if (registro_id) where.registro_id = registro_id;
            if (hallazgo_id) where.hallazgo_id = hallazgo_id;
            if (estado) where.estado = estado;
            if (responsable_id) where.responsable_id = responsable_id;

            // Prepare includes for filtering
            const includeRegistro = {
                model: Registro,
                as: 'registro',
                required: !!(registro_id || contratista_id || servicio_id || dependencia_id),
                include: []
            };

            if (contratista_id || servicio_id || dependencia_id) {
                const includeVinculacion = {
                    model: Vinculacion,
                    as: 'vinculacionEntidad',
                    required: true,
                    where: {}
                };
                if (contratista_id) includeVinculacion.where.contratista_id = contratista_id;
                if (servicio_id) includeVinculacion.where.servicio_id = servicio_id;
                if (dependencia_id) includeVinculacion.where.dependencia_id = dependencia_id;

                includeRegistro.include.push(includeVinculacion);
            }

            // Role-based filtering (Security). getAllowedVinculacionIds cubre los 3 roles
            // restringidos de forma uniforme (antes faltaba la rama administrador_contrato
            // por completo: veía TODOS los compromisos del sistema sin filtrar).
            const user = req.user;
            const allowedVincIds = await getAllowedVinculacionIds(user);
            if (allowedVincIds !== null) {
                let vincInclude = includeRegistro.include.find(inc => inc.as === 'vinculacionEntidad');
                if (!vincInclude) {
                    vincInclude = {
                        model: Vinculacion,
                        as: 'vinculacionEntidad',
                        required: true,
                        where: {}
                    };
                    includeRegistro.include.push(vincInclude);
                }
                includeRegistro.required = true;
                // AND con cualquier filtro de query ya presente (contratista_id/servicio_id/
                // dependencia_id): solo puede acotar más, nunca ampliar el scope, porque
                // "id" ya fija el conjunto exacto de vinculaciones permitidas.
                vincInclude.where = { ...vincInclude.where, id: { [Op.in]: allowedVincIds.length > 0 ? allowedVincIds : [-1] } };
            }

            const compromisos = await Compromiso.findAll({
                where,
                include: [
                    includeRegistro, // Added for filtering
                    { model: Hallazgo, as: 'hallazgo', attributes: ['id', 'descripcion', 'tipo'] },
                    { model: User, as: 'responsable', attributes: ['id', 'name'] },
                    { model: User, as: 'creadoPor', attributes: ['id', 'name'] }
                ],
                order: [['fecha_compromiso', 'ASC']]
            });

            res.json({ success: true, data: compromisos });
        } catch (error) {
            console.error('Compromisos index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener compromisos' });
        }
    },

    // POST /api/compromisos
    // POST /api/compromisos
    async store(req, res) {
        try {
            const {
                registro_id,
                hallazgo_id,
                descripcion,
                fecha_compromiso
            } = req.body;

            if (!registro_id || !descripcion || !fecha_compromiso) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos obligatorios'
                });
            }

            // SECURITY: IDOR — sin esto, cualquier usuario autenticado podía crear un
            // compromiso sobre el registro de otra empresa/contrato con solo enviar su id.
            if (!(await isRegistroInScope(req.user, registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para crear un compromiso sobre este registro' });
            }

            // Determine responsable (usually the logged in user or the assigned contractor)
            const responsable_id = req.user.id;
            const creado_por_id = req.user.id;

            const compromiso = await Compromiso.create({
                registro_id,
                hallazgo_id: hallazgo_id || null,
                responsable_id,
                creado_por_id,

                descripcion,
                fecha_compromiso,
                estado: 'pendiente'
            });

            res.status(201).json({ success: true, data: compromiso });
        } catch (error) {
            console.error('Compromiso store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear compromiso' });
        }
    },

    // GET /api/compromisos/:id
    async show(req, res) {
        try {
            const compromiso = await Compromiso.findByPk(req.params.id, {
                include: [
                    { model: Hallazgo, as: 'hallazgo' },
                    { model: User, as: 'responsable', attributes: ['id', 'name'] }
                ]
            });

            if (!compromiso) {
                return res.status(404).json({ success: false, message: 'Compromiso no encontrado' });
            }

            // SECURITY: IDOR — mismo hueco que cargarEvidencia, en el mismo recurso.
            if (!(await isRegistroInScope(req.user, compromiso.registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para ver este compromiso' });
            }

            res.json({ success: true, data: compromiso });
        } catch (error) {
            console.error('Compromiso show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener compromiso' });
        }
    },

    // PUT /api/compromisos/:id
    async update(req, res) {
        try {
            const compromiso = await Compromiso.findByPk(req.params.id);

            if (!compromiso) {
                return res.status(404).json({ success: false, message: 'Compromiso no encontrado' });
            }

            if (!(await isRegistroInScope(req.user, compromiso.registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para modificar este compromiso' });
            }

            const { estado, observacion_cumplimiento } = req.body;

            // Only update specific fields
            if (estado) compromiso.estado = estado;
            if (observacion_cumplimiento) compromiso.observacion_cumplimiento = observacion_cumplimiento;
            if (estado === 'cumplido' && !compromiso.fecha_cumplimiento) {
                compromiso.fecha_cumplimiento = new Date();
            }

            await compromiso.save();

            res.json({ success: true, data: compromiso });
        } catch (error) {
            console.error('Compromiso update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar compromiso' });
        }
    },

    // PATCH /api/compromisos/:id/cumplir
    async cumplir(req, res) {
        try {
            const user = req.user;
            if (user.role !== 'admin' && user.role !== 'administrador_contrato') {
                if (req.file && fs.existsSync(req.file.path)) {
                    try {
                        fs.unlinkSync(req.file.path);
                    } catch (unlinkError) {
                        console.error('Failed to clean up temp file:', unlinkError);
                    }
                }
                return res.status(403).json({ success: false, message: 'No autorizado para marcar compromiso como cumplido' });
            }

            const compromiso = await Compromiso.findByPk(req.params.id);
            if (!compromiso) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({ success: false, message: 'Compromiso no encontrado' });
            }

            let dbPath = null;
            if (req.file) {
                const storageRelativePath = path.join(
                    'compromisos',
                    String(compromiso.id)
                );

                const storageRoot = path.join(__dirname, '../../../storage');
                const targetDir = path.join(storageRoot, storageRelativePath);

                // Create recursive directory if it doesn't exist
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const targetPath = path.join(targetDir, req.file.filename);

                // Move file from temporary upload dir to target directory
                safeMove(req.file.path, targetPath);

                // Save relative path for DB (normalized with forward slashes)
                dbPath = path.posix.join('storage', storageRelativePath.split(path.sep).join('/'), req.file.filename);
            }

            compromiso.estado = 'cumplido';
            compromiso.fecha_cumplimiento = new Date();
            if (dbPath) compromiso.ruta_evidencia = dbPath;
            if (req.body.comentario_evidencia) compromiso.comentario_evidencia = req.body.comentario_evidencia;
            if (req.body.observacion_cumplimiento) compromiso.observacion_cumplimiento = req.body.observacion_cumplimiento;

            await compromiso.save();

            res.json({ success: true, data: compromiso });
        } catch (error) {
            console.error('Error marking commitment as fulfilled:', error);
            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Failed to clean up temp file:', unlinkError);
                }
            }
            res.status(500).json({ success: false, message: 'Error al marcar compromiso como cumplido' });
        }
    },

    // PATCH /api/compromisos/:id/evidencia
    async cargarEvidencia(req, res) {
        try {
            const compromiso = await Compromiso.findByPk(req.params.id);
            if (!compromiso) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({ success: false, message: 'Compromiso no encontrado' });
            }

            // SECURITY: sin esto, cualquier usuario autenticado podía adjuntar/reemplazar
            // la evidencia de un compromiso de cualquier otra empresa con solo conocer su :id.
            if (!(await isRegistroInScope(req.user, compromiso.registro_id))) {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(403).json({ success: false, message: 'No tiene permiso para cargar evidencia en este compromiso' });
            }

            let dbPath = null;
            if (req.file) {
                const storageRelativePath = path.join(
                    'compromisos',
                    String(compromiso.id)
                );

                const storageRoot = path.join(__dirname, '../../../storage');
                const targetDir = path.join(storageRoot, storageRelativePath);

                // Create recursive directory if it doesn't exist
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const targetPath = path.join(targetDir, req.file.filename);

                // Move file from temporary upload dir to target directory
                safeMove(req.file.path, targetPath);

                // Save relative path for DB (normalized with forward slashes)
                dbPath = path.posix.join('storage', storageRelativePath.split(path.sep).join('/'), req.file.filename);
            }

            if (req.user.role !== 'contratista_user' && req.user.role !== 'contratista_admin') {
                if (compromiso.estado === 'pendiente') {
                    compromiso.estado = 'en_proceso';
                }
            }
            if (dbPath) compromiso.ruta_evidencia = dbPath;
            if (req.body.comentario_evidencia) compromiso.comentario_evidencia = req.body.comentario_evidencia;

            await compromiso.save();

            res.json({ success: true, data: compromiso });
        } catch (error) {
            console.error('Error uploading evidence for commitment:', error);
            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (unlinkError) {
                    console.error('Failed to clean up temp file:', unlinkError);
                }
            }
            res.status(500).json({ success: false, message: 'Error al cargar evidencia' });
        }
    },

    // DELETE /api/compromisos/:id
    async destroy(req, res) {
        try {
            const compromiso = await Compromiso.findByPk(req.params.id);
            if (!compromiso) return res.status(404).json({ success: false, message: 'Not found' });

            if (!(await isRegistroInScope(req.user, compromiso.registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para eliminar este compromiso' });
            }

            await compromiso.destroy();
            res.json({ success: true, message: 'Eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error' });
        }
    }
};

module.exports = compromisoController;
