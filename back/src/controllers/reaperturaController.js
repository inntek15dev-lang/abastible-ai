// IEEE Trace: REQ-004 | US-004 | reaperturaController.js
const { Op } = require('sequelize');
const {
    SolicitudReapertura,
    Registro,
    RegistroLog,
    User,
    Administracion,
    Vinculacion,
    Contratista,
    TipoContratista,
    Dependencia,
    Subgerencia,
    Gerencia
} = require('../database/models');
const { getAllowedVinculacionIds } = require('../utils/scopeHelper');
const emailService = require('../services/emailService');

const reaperturaController = {
    // GET /api/reaperturas
    async index(req, res) {
        try {
            const { estado, adc_id, periodo } = req.query;
            const where = {};

            if (estado) where.estado = estado;

            // Filtro Universal por Rol: admin ve todo, contratista_admin filtra
            // por su empresa (id_cot), administrador_contrato filtra por las
            // vinculaciones que administra, contratista_user por sus contratos.
            const allowedVincIds = await getAllowedVinculacionIds(req.user);

            const registroWhere = {};
            if (periodo && periodo !== 'todos') {
                registroWhere.periodo = { [Op.like]: `${periodo}%` };
            }

            let vincFilterIds = allowedVincIds;

            // Intersección por ADC si se especifica en query params
            if (adc_id && adc_id !== 'todos') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: adc_id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const adcVincIds = adminRecords.map(a => Number(a.vinculacion_id));

                if (vincFilterIds === null) {
                    vincFilterIds = adcVincIds;
                } else {
                    vincFilterIds = vincFilterIds.filter(id => adcVincIds.includes(Number(id)));
                }
            }

            if (vincFilterIds !== null) {
                registroWhere.contratista_asignacion_id = {
                    [Op.in]: vincFilterIds.length > 0 ? vincFilterIds : [-1]
                };
            }

            const registroInclude = {
                model: Registro,
                as: 'registro',
                attributes: ['id', 'periodo', 'eecc_nombre', 'contratista_asignacion_id'],
                where: Object.keys(registroWhere).length > 0 ? registroWhere : undefined,
                required: true,
                include: [
                    {
                        model: Vinculacion,
                        as: 'vinculacionEntidad',
                        required: false,
                        include: [
                            { model: Contratista, as: 'contratista', attributes: ['id', 'nombre', 'rut'] },
                            { model: Gerencia, as: 'gerencia', attributes: ['id', 'nombre'] },
                            { model: Subgerencia, as: 'subgerencia', attributes: ['id', 'nombre'] },
                            { model: TipoContratista, as: 'servicio', attributes: ['id', 'nombre'] },
                            {
                                model: Dependencia,
                                as: 'dependencia',
                                attributes: ['id', 'nombre'],
                                include: [{
                                    model: Subgerencia,
                                    as: 'subgerencia',
                                    attributes: ['id', 'nombre'],
                                    include: [{ model: Gerencia, as: 'gerencia', attributes: ['id', 'nombre'] }]
                                }]
                            },
                            {
                                model: Administracion,
                                as: 'administraciones',
                                where: { activo: 1 },
                                required: false,
                                include: [
                                    { model: User, as: 'administradorContrato', attributes: [['usu_id', 'id'], 'name', 'email'] }
                                ]
                            }
                        ]
                    }
                ]
            };

            const solicitudes = await SolicitudReapertura.findAll({
                where,
                include: [
                    registroInclude,
                    { model: User, as: 'solicitante', attributes: [['usu_id', 'id'], 'name', 'email'] },
                    { model: User, as: 'aprobador', attributes: [['usu_id', 'id'], 'name'] }
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

            if (!['auditado', 'auditada', 'AUDITADA', 'cerrado', 'finalizado'].includes(registro.estado_auditoria)) {
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

            // Mark registro as reapertura_solicitada
            await registro.update({ estado_auditoria: 'reapertura_solicitada' });

            // Log
            await RegistroLog.create({
                registro_id,
                user_id: req.user.id,
                accion: 'SOLICITAR_REAPERTURA',
                descripcion: motivo,
                ip_address: req.ip
            });

            // Notify ADC(s) (PARKO)
            try {
                const admins = await Administracion.findAll({
                    where: { vinculacion_id: registro.contratista_asignacion_id, activo: 1 },
                    include: [{ model: User, as: 'administradorContrato', attributes: ['email'] }]
                });
                const adminEmails = admins.map(a => a.administradorContrato?.email).filter(Boolean);
                
                if (adminEmails.length > 0) {
                    await emailService.notifyReaperturaSolicitada(registro, req.user, adminEmails, motivo);
                }
            } catch (emailErr) {
                console.error('Error notifying admins of reopening:', emailErr);
            }

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

            let fLimite = req.body.fecha_limite ? String(req.body.fecha_limite).trim() : null;
            if (fLimite === '' || fLimite === 'null' || fLimite === 'undefined') fLimite = null;

            // Reopen the registro
            await solicitud.registro.update({
                estado_auditoria: 'pendiente_subsanacion',
                cerrado: 0,
                fecha_limite_subsanacion: fLimite
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

            // Revert registro estado to finalizado as per business rule (reopening rejected)
            const registro = await Registro.findByPk(solicitud.registro_id);
            if (registro) {
                await registro.update({
                    estado_auditoria: 'finalizado'
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
            if (!['auditado', 'auditada', 'AUDITADA', 'cerrado', 'reapertura_pendiente', 'finalizado'].includes(registro.estado_auditoria)) {
                return res.status(400).json({
                    success: false,
                    message: 'El registro no está en un estado que permita reapertura'
                });
            }

            // Update registro (no solicitud created, direct action)
            await registro.update({
                estado_auditoria: 'pendiente',
                cerrado: 0,
                auditado: 0,
                porcentaje_cumplimiento_auditor: null,
                fecha_auditoria: null,
                auditado_por: null
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
    },

    // POST /api/reaperturas/notificar-adc
    async notificarPendientesAdc(req, res) {
        try {
            const { adc_id, periodo, mensaje } = req.body;

            if (!adc_id || adc_id === 'todos') {
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar un Administrador de Contrato válido.'
                });
            }

            // Buscar usuario ADC
            const adcUser = await User.findOne({
                where: {
                    [Op.or]: [{ usu_id: adc_id }, { id: adc_id }]
                },
                attributes: [['usu_id', 'id'], 'name', 'email', 'role']
            });

            if (!adcUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrador de Contrato no encontrado.'
                });
            }

            if (!adcUser.email) {
                return res.status(400).json({
                    success: false,
                    message: `El Administrador de Contrato ${adcUser.name} no posee un correo electrónico registrado.`
                });
            }

            // Obtener vinculaciones administradas activas
            const adminRecords = await Administracion.findAll({
                where: {
                    [Op.or]: [
                        { administrador_contrato_id: adc_id },
                        { administrador_contrato_id: adcUser.id || adcUser.usu_id }
                    ],
                    activo: 1
                },
                attributes: ['vinculacion_id']
            });

            const adcVincIds = adminRecords.map(a => Number(a.vinculacion_id));
            if (adcVincIds.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `El Administrador de Contrato ${adcUser.name} no tiene vinculaciones activas asignadas.`
                });
            }

            // Filtro de registro
            const registroWhere = {
                contratista_asignacion_id: { [Op.in]: adcVincIds }
            };

            if (periodo && periodo !== 'todos') {
                registroWhere.periodo = { [Op.like]: `${periodo}%` };
            }

            // Buscar solicitudes pendientes
            const solicitudes = await SolicitudReapertura.findAll({
                where: { estado: 'pendiente' },
                include: [
                    {
                        model: Registro,
                        as: 'registro',
                        where: registroWhere,
                        required: true,
                        include: [
                            {
                                model: Vinculacion,
                                as: 'vinculacionEntidad',
                                required: false,
                                include: [
                                    { model: Contratista, as: 'contratista', attributes: ['id', 'nombre', 'rut'] },
                                    { model: Gerencia, as: 'gerencia', attributes: ['id', 'nombre'] },
                                    { model: Subgerencia, as: 'subgerencia', attributes: ['id', 'nombre'] },
                                    { model: TipoContratista, as: 'servicio', attributes: ['id', 'nombre'] },
                                    {
                                        model: Dependencia,
                                        as: 'dependencia',
                                        attributes: ['id', 'nombre'],
                                        include: [{
                                            model: Subgerencia,
                                            as: 'subgerencia',
                                            attributes: ['id', 'nombre'],
                                            include: [{ model: Gerencia, as: 'gerencia', attributes: ['id', 'nombre'] }]
                                        }]
                                    }
                                ]
                            }
                        ]
                    },
                    { model: User, as: 'solicitante', attributes: [['usu_id', 'id'], 'name', 'email'] }
                ],
                order: [['created_at', 'DESC']]
            });

            if (solicitudes.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `No existen solicitudes de reapertura pendientes para ${adcUser.name}${periodo && periodo !== 'todos' ? ` en el periodo ${periodo}` : ''}.`
                });
            }

            // Enviar correo mediante emailService
            const sent = await emailService.notifyResumenReaperturasPendientesADC({
                adcUser,
                solicitudes,
                periodo,
                mensaje
            });

            if (!sent) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al enviar el correo al Administrador de Contrato.'
                });
            }

            res.json({
                success: true,
                message: `Correo enviado exitosamente a ${adcUser.name} (${adcUser.email}) con ${solicitudes.length} solicitud(es) pendiente(s).`,
                data: {
                    total_solicitudes: solicitudes.length,
                    destinatario: adcUser.email,
                    adc_nombre: adcUser.name
                }
            });
        } catch (error) {
            console.error('Error notificarPendientesAdc:', error);
            res.status(500).json({ success: false, message: 'Error al notificar al Administrador de Contrato' });
        }
    }
};

module.exports = reaperturaController;
