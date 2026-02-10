// IEEE Trace: REQ-003 | US-003 | auditoriaController.js
const {
    Auditoria,
    Registro,
    RegistroActividad,
    RegistroLog,
    Hallazgo,
    Compromiso,
    Actividad
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

            // Calculate auditor percentage
            const actividades = registro.actividades;
            const auditadas = actividades.filter(a => a.cumple_auditor !== null);
            const cumplidas = auditadas.filter(a => a.cumple_auditor === true);
            const porcentaje = auditadas.length > 0
                ? ((cumplidas.length / auditadas.length) * 100).toFixed(2)
                : 0;

            const estadoFinal = registro.tipo_auditoria === 'terreno'
                ? 'auditada_terreno'
                : 'auditada_sistema';

            await registro.update({
                estado_auditoria: estadoFinal,
                porcentaje_cumplimiento_auditor: porcentaje,
                fecha_auditoria: new Date()
            });

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
