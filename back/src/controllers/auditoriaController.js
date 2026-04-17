// IEEE Trace: REQ-003 | US-003 | auditoriaController.js
const {
    Auditoria,
    Registro,
    RegistroActividad,
    RegistroLog,
    Hallazgo,
    Compromiso,
    Actividad,
    AuditoriaComentario,
    User
} = require('../database/models');
const emailService = require('../services/emailService');

const auditoriaController = {
    // POST /api/registros/:id/auditar - Iniciar auditoría
    async iniciarAuditoria(req, res) {
        try {
            const { id } = req.params;
            const { tipo_auditoria = 'sistema' } = req.body;

            const registro = await Registro.findByPk(id);
            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            if (registro.estado_auditoria !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    message: 'El registro ya está siendo auditado o fue auditado'
                });
            }

            await registro.update({
                estado_auditoria: 'auditando',
                tipo_auditoria,
                auditor_id: req.user.id
            });

            // Log
            await RegistroLog.create({
                registro_id: registro.id,
                user_id: req.user.id,
                accion: 'INICIAR_AUDITORIA',
                descripcion: `Auditoría ${tipo_auditoria} iniciada`,
                ip_address: req.ip
            });

            res.json({ success: true, data: registro, message: 'Auditoría iniciada' });
        } catch (error) {
            console.error('Iniciar auditoria error:', error);
            res.status(500).json({ success: false, message: 'Error al iniciar auditoría' });
        }
    },

    // PUT /api/registros/:id/actividades/:actividadId/auditar
    async auditarActividad(req, res) {
        try {
            const { id, actividadId } = req.params;
            const { cumple_auditor, observacion_auditor } = req.body;

            const registroActividad = await RegistroActividad.findOne({
                where: { id: actividadId, registro_id: id }
            });

            if (!registroActividad) {
                return res.status(404).json({ success: false, message: 'Actividad no encontrada' });
            }

            await registroActividad.update({
                cumple_auditor,
                observacion_auditor
            });

            res.json({ success: true, data: registroActividad });
        } catch (error) {
            console.error('Auditar actividad error:', error);
            res.status(500).json({ success: false, message: 'Error al auditar actividad' });
        }
    },

    // POST /api/registros/:id/iniciar-revision - Iniciar revisión de subsanación
    async iniciarRevision(req, res) {
        try {
            const { id } = req.params;
            const registro = await Registro.findByPk(id);

            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            if (registro.estado_auditoria !== 'subsanado') {
                return res.status(400).json({
                    success: false,
                    message: 'El registro no está en estado subsanado'
                });
            }

            await registro.update({
                estado_auditoria: 'en_revision'
            });

            // Log
            await RegistroLog.create({
                registro_id: registro.id,
                user_id: req.user.id,
                accion: 'INICIAR_REVISION',
                descripcion: 'Revisión de subsanación iniciada',
                ip_address: req.ip
            });

            res.json({ success: true, data: registro, message: 'Revisión iniciada' });
        } catch (error) {
            console.error('Iniciar revision error:', error);
            res.status(500).json({ success: false, message: 'Error al iniciar revisión' });
        }
    },

    // POST /api/registros/:id/finalizar-revision - Finalizar revisión de subsanación
    async finalizarRevision(req, res) {
        try {
            const { id } = req.params;
            const { comentario_general } = req.body;

            const registro = await Registro.findByPk(id, {
                include: [{ model: RegistroActividad, as: 'actividades' }]
            });

            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            if (registro.estado_auditoria !== 'en_revision') {
                return res.status(400).json({
                    success: false,
                    message: 'El registro no está en proceso de revisión'
                });
            }

            // Recalculate percentage (same logic as finalizarAuditoria)
            const actividades = registro.actividades || [];
            const auditables = actividades.filter(a => a.cumple_auditor !== null && a.cumple_auditor !== 2);
            const cumplidas = auditables.filter(a => a.cumple_auditor === true || a.cumple_auditor === 1).length;
            const porcentaje = auditables.length > 0 ? ((cumplidas / auditables.length) * 100).toFixed(2) : 0;

            await registro.update({
                estado_auditoria: 'finalizado',
                porcentaje_cumplimiento_auditor: porcentaje,
                fecha_auditoria: new Date()
            });

            // Fetch contractor email
            const contractor = await User.findByPk(registro.user_id);
            if (contractor?.email) {
                await emailService.notifyAuditoriaFinalizada(registro, contractor.email);
            }

            if (comentario_general) {
                await AuditoriaComentario.create({
                    registro_id: registro.id,
                    user_id: req.user.id,
                    comentario: comentario_general,
                    tipo: 'general'
                });
            }

            // Log
            await RegistroLog.create({
                registro_id: registro.id,
                user_id: req.user.id,
                accion: 'FINALIZAR_REVISION',
                descripcion: `Revisión de subsanación finalizada. Cumplimiento final: ${porcentaje}%`,
                ip_address: req.ip
            });

            res.json({ success: true, data: registro, message: 'Revisión finalizada' });
        } catch (error) {
            console.error('Finalizar revision error:', error);
            res.status(500).json({ success: false, message: 'Error al finalizar revisión' });
        }
    },

    // POST /api/registros/:id/finalizar-auditoria
    async finalizarAuditoria(req, res) {
        try {
            const { id } = req.params;
            const { comentario_general } = req.body;

            const registro = await Registro.findByPk(id, {
                include: [{ model: RegistroActividad, as: 'actividades' }]
            });

            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            if (registro.estado_auditoria !== 'auditando') {
                return res.status(400).json({
                    success: false,
                    message: 'El registro no está en proceso de auditoría'
                });
            }

            // Calculate auditor percentage: Exclude N/A (2) and handle nulls
            const actividades = registro.actividades || [];
            // Filter only applicable and audited activities (not null and not 2)
            const auditables = actividades.filter(a => a.cumple_auditor !== null && a.cumple_auditor !== 2);
            // Numerator: count those that are true/1
            const cumplidas = auditables.filter(a => a.cumple_auditor === true || a.cumple_auditor === 1).length;

            const porcentaje = auditables.length > 0
                ? ((cumplidas / auditables.length) * 100).toFixed(2)
                : 0;

            const estadoFinal = 'auditada';

            await registro.update({
                estado_auditoria: estadoFinal,
                porcentaje_cumplimiento_auditor: porcentaje,
                fecha_auditoria: new Date()
            });

            // Fetch contractor email
            const contractor = await User.findByPk(registro.user_id);
            if (contractor?.email) {
                await emailService.notifyAuditoriaFinalizada(registro, contractor.email);
            }

            // Add general comment if provided
            if (comentario_general) {
                await AuditoriaComentario.create({
                    registro_id: registro.id,
                    user_id: req.user.id,
                    comentario: comentario_general,
                    tipo: 'general'
                });
            }

            // Log finish
            await RegistroLog.create({
                registro_id: registro.id,
                user_id: req.user.id,
                accion: 'FINALIZAR_AUDITORIA',
                descripcion: `Auditoría finalizada. Cumplimiento: ${registro.porcentaje_cumplimiento}%`,
                ip_address: req.ip
            });

            // Notify Contractor (Mock)
            // const contractor = await User.findByPk(registro.user_id);
            // await emailService.notifyAuditoriaFinalizada(contractor.email, registro, registro.porcentaje_cumplimiento);
            console.log(`[MOCK EMAIL] Auditoría Finalizada: ${registro.periodo} - Cumplimiento: ${registro.porcentaje_cumplimiento}%`);

            res.json({ success: true, data: registro });
        } catch (error) {
            console.error('Finalizar auditoria error:', error);
            res.status(500).json({ success: false, message: 'Error al finalizar auditoría' });
        }
    },

    // POST /api/registros/:id/comentarios
    async agregarComentario(req, res) {
        try {
            const { id } = req.params;
            const { comentario, tipo = 'general', registro_actividad_id } = req.body;

            const comentarioData = await AuditoriaComentario.create({
                registro_id: id,
                user_id: req.user.id,
                comentario,
                tipo,
                registro_actividad_id
            });

            res.status(201).json({ success: true, data: comentarioData });
        } catch (error) {
            console.error('Agregar comentario error:', error);
            res.status(500).json({ success: false, message: 'Error al agregar comentario' });
        }
    }
};

module.exports = auditoriaController;
