const { Compromiso, Hallazgo, Registro, User, ContratistaAsignacion, Vinculacion } = require('../database/models');
const { Op } = require('sequelize');

const compromisoController = {
    // GET /api/compromisos
    async index(req, res) {
        try {
            const { registro_id, hallazgo_id, estado, responsable_id } = req.query;
            let where = {};

            if (registro_id) where.registro_id = registro_id;
            if (hallazgo_id) where.hallazgo_id = hallazgo_id;
            if (estado) where.estado = estado;
            if (responsable_id) where.responsable_id = responsable_id;

            // Role-based filtering (Security)
            const user = req.user;
            if (user.role === 'contratista_user' || user.role === 'contratista_admin') {
                // Ensure they only see their own assignments/commitments
                where.responsable_id = user.id;
                // OR filter by assignments logic if needed, but simple ownership check for now
            }

            const compromisos = await Compromiso.findAll({
                where,
                include: [
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

            // Determine responsable (usually the logged in user or the assigned contractor)
            const responsable_id = req.user.id;
            const creado_por_id = req.user.id;

            let numeroContrato = null;

            // Fetch numero_contrato from Vinculacion linked to Registro
            const registro = await Registro.findByPk(registro_id);
            if (registro && registro.contratista_asignacion_id) {
                // registro.contratista_asignacion_id points to Vinculacion table ID
                const vinculacion = await Vinculacion.findByPk(registro.contratista_asignacion_id);
                if (vinculacion) {
                    numeroContrato = vinculacion.numero_contrato;
                }
            }

            const compromiso = await Compromiso.create({
                registro_id,
                hallazgo_id: hallazgo_id || null,
                responsable_id,
                creado_por_id,
                numero_contrato: numeroContrato,
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
            const compromiso = await Compromiso.findByPk(req.params.id);
            if (!compromiso) return res.status(404).json({ success: false, message: 'Not found' });

            compromiso.estado = 'cumplido';
            compromiso.fecha_cumplimiento = new Date();
            await compromiso.save();

            res.json({ success: true, data: compromiso });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error' });
        }
    },

    // DELETE /api/compromisos/:id
    async destroy(req, res) {
        try {
            const compromiso = await Compromiso.findByPk(req.params.id);
            if (!compromiso) return res.status(404).json({ success: false, message: 'Not found' });
            await compromiso.destroy();
            res.json({ success: true, message: 'Eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error' });
        }
    }
};

module.exports = compromisoController;
