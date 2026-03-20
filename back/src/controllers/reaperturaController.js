// IEEE Trace: REQ-004 | US-004 | reaperturaController.js
const {
    SolicitudReapertura,
    Registro,
    RegistroLog,

    User
} = require('../database/models');
const emailService = require('../services/emailService');

const reaperturaController = {
    // GET /api/reaperturas
    async index(req, res) {
        try {
            const { estado } = req.query;
            let where = {};

            if (estado) where.estado = estado;

            // Role-based filtering
            if (['contratista_admin', 'contratista_user'].includes(req.user.role)) {
                where.solicitante_id = req.user.id;
            }

            const solicitudes = await SolicitudReapertura.findAll({
                where,
                include: [
                    {
                        model: Registro,
                        as: 'registro',
                        attributes: ['id', 'periodo', 'eecc_nombre']
                    },
                    { model: User, as: 'solicitante', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'aprobador', attributes: ['id', 'name'] }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: solicitudes });
        } catch (error) {
            console.error('Reaperturas index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
        }
    },

    // POST /api/reaperturas
    async store(req, res) {
        try {
            const { registro_id, motivo } = req.body;

            if (!registro_id || !motivo) {
                return res.status(400).json({
                    success: false,
                    message: 'registro_id y motivo son requeridos'
                });
            }

            // Check registro exists and is in a state that can be reopened
            const registro = await Registro.findByPk(registro_id);
            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            if (!['auditado', 'auditada', 'AUDITADA', 'cerrado'].includes(registro.estado_auditoria)) {
                return res.status(400).json({
                    success: false,
                    message: 'El registro no está en un estado que permita reapertura'
                });
            }

            // Check for existing pending request
            const existing = await SolicitudReapertura.findOne({
                where: { registro_id, estado: 'pendiente' }
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una solicitud de reapertura pendiente para este registro'
                });
            }

            const solicitud = await SolicitudReapertura.create({
                registro_id,
                solicitante_id: req.user.id,
                motivo,
                estado: 'pendiente',
                estado_previo: registro.estado_auditoria
            });

            // Mark registro as reapertura_pendiente
            await registro.update({ estado_auditoria: 'reapertura_pendiente' });

            // Log
            await RegistroLog.create({
                registro_id,
                user_id: req.user.id,
                accion: 'SOLICITAR_REAPERTURA',
                descripcion: motivo,
                ip_address: req.ip
            });

            // Notify Admin (Mock)
            await emailService.notifyReaperturaSolicitada(registro, req.user, 'admin@abastible.cl');
            // Notify Admin (Mock)
            await emailService.notifyReaperturaSolicitada(registro, req.user, 'admin@abastible.cl');
            console.log(`[MOCK EMAIL] Solicitud Reapertura: ${registro.periodo} - ${motivo}`);

            res.status(201).json({ success: true, data: solicitud });
        } catch (error) {
            console.error('Reapertura store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear solicitud' });
        }
    },

    // PUT /api/reaperturas/:id/aprobar
    async aprobar(req, res) {
        try {
            const solicitud = await SolicitudReapertura.findByPk(req.params.id, {
                include: [
                    { model: Registro, as: 'registro' },
                    { model: User, as: 'solicitante', attributes: ['email'] }
                ]
            });

            if (!solicitud) {
                return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
            }

            if (solicitud.estado !== 'pendiente') {
                return res.status(400).json({ success: false, message: 'La solicitud ya fue procesada' });
            }

            await solicitud.update({
                estado: 'aprobada',
                aprobador_id: req.user.id,
                respuesta: req.body.respuesta || 'Aprobada',
                fecha_respuesta: new Date()
            });

            // Reopen the registro
            await solicitud.registro.update({
                estado_auditoria: 'reabierto',
                cerrado: 0,
                fecha_limite_subsanacion: req.body.fecha_limite || null
            });

            // Log
            await RegistroLog.create({
                registro_id: solicitud.registro_id,
                user_id: req.user.id,
                accion: 'APROBAR_REAPERTURA',
                descripcion: `Reapertura aprobada: ${req.body.respuesta || 'Sin comentario'}`,
                ip_address: req.ip
            });

            // Notify Solicitor (Real Mock/Service)
            if (solicitud.solicitante?.email) {
                await emailService.notifyReaperturaResult(solicitud, solicitud.registro, solicitud.solicitante.email);
            }
            console.log(`[MOCK EMAIL] Reapertura Aprobada: ${solicitud.registro_id}`);

            res.json({ success: true, data: solicitud, message: 'Reapertura aprobada' });
        } catch (error) {
            console.error('Aprobar reapertura error:', error);
            res.status(500).json({ success: false, message: 'Error al aprobar' });
        }
    },

    // PUT /api/reaperturas/:id/rechazar
    async rechazar(req, res) {
        try {
            const { respuesta } = req.body;

            if (!respuesta) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe proporcionar una razón para rechazar'
                });
            }

            const solicitud = await SolicitudReapertura.findByPk(req.params.id, {
                include: [
                    { model: Registro, as: 'registro' },
                    { model: User, as: 'solicitante', attributes: ['email'] }
                ]
            });

            if (!solicitud) {
                return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
            }

            if (solicitud.estado !== 'pendiente') {
                return res.status(400).json({ success: false, message: 'La solicitud ya fue procesada' });
            }

            await solicitud.update({
                estado: 'rechazada',
                aprobador_id: req.user.id,
                respuesta,
                fecha_respuesta: new Date()
            });

            // Revert registro estado to previous state
            const registro = await Registro.findByPk(solicitud.registro_id);
            if (registro && registro.estado_auditoria === 'reapertura_pendiente') {
                await registro.update({
                    estado_auditoria: solicitud.estado_previo || 'auditada'
                });
            }

            // Log
            await RegistroLog.create({
                registro_id: solicitud.registro_id,
                user_id: req.user.id,
                accion: 'RECHAZAR_REAPERTURA',
                descripcion: `Reapertura rechazada: ${respuesta}`,
                ip_address: req.ip
            });

            // Notify Solicitor
            if (solicitud.solicitante?.email) {
                await emailService.notifyReaperturaResult(solicitud, solicitud.registro, solicitud.solicitante.email);
            }

            res.json({ success: true, data: solicitud, message: 'Reapertura rechazada' });
        } catch (error) {
            console.error('Rechazar reapertura error:', error);
            res.status(500).json({ success: false, message: 'Error al rechazar' });
        }
    },

    // POST /api/reaperturas/directa (Admin/ADC Only)
    async reabrirDirectamente(req, res) {
        try {
            const { registro_id, motivo } = req.body;

            if (!registro_id || !motivo) {
                return res.status(400).json({ success: false, message: 'registro_id y motivo requeridos' });
            }

            const registro = await Registro.findByPk(registro_id);
            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            // Verify state
            if (!['auditado', 'auditada', 'AUDITADA', 'cerrado', 'reapertura_pendiente'].includes(registro.estado_auditoria)) {
                return res.status(400).json({
                    success: false,
                    message: 'El registro no está en un estado que permita reapertura'
                });
            }

            // Update registro (no solicitud created, direct action)
            await registro.update({
                estado_auditoria: 'pendiente',
                cerrado: 0,
                auditado: 0
            });

            // Log
            await RegistroLog.create({
                registro_id,
                user_id: req.user.id,
                accion: 'REAPERTURA_DIRECTA',
                descripcion: `Reapertura directa por administración: ${motivo}`,
                ip_address: req.ip
            });

            console.log(`[MOCK EMAIL] Reapertura Directa: ${registro.periodo} - ${motivo}`);

            res.json({ success: true, message: 'Registro reabierto exitosamente' });

        } catch (error) {
            console.error('Reapertura directa error:', error);
            res.status(500).json({ success: false, message: 'Error al reabrir registro' });
        }
    }
};

module.exports = reaperturaController;
