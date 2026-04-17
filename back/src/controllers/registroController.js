// IEEE Trace: REQ-002 | US-002 | registroController.js
const { Op } = require('sequelize');
const {
    Registro,
    RegistroActividad,
    RegistroLog,
    User,
    ContratistaAsignacion,
    Actividad,
    Elemento,
    Programa,
    TipoContratista,

    Dependencia,
    Evidencia,
    Hallazgo, // Import Hallazgo model
    Contratista,
    Vinculacion,
    Administracion,
    Gerencia,
    Subgerencia
} = require('../database/models');
const emailService = require('../services/emailService'); // Import emailService

const registroController = {
    // GET /api/registros
    async index(req, res) {
        try {
            const { user, role } = req.user;
            let where = {};

            // Apply role-based filtering (RN-002)
            // Apply role-based filtering (RN-002)
            if (req.user.role === 'contratista_admin') {
                // Contractor Admin sees ALL records for their Company (via Vinculacion)
                if (req.user.contratista_id) {
                    const vinculaciones = await Vinculacion.findAll({
                        where: { contratista_id: req.user.contratista_id },
                        attributes: ['id']
                    });
                    const vinculacionIds = vinculaciones.map(v => v.id);

                    where = {
                        [Op.or]: [
                            { user_id: req.user.id }, // Created by me
                            { contratista_asignacion_id: { [Op.in]: vinculacionIds } } // Belonging to my company
                        ]
                    };
                } else {
                    // Fallback if no contratista_id (should not happen for valid admin)
                    where.user_id = req.user.id;
                }
            } else if (req.user.role === 'contratista_user') {
                // Contractors User only sees their own records (or created by parent?)
                where.user_id = req.user.id;

                // If contratista_user, also check parent (Legacy logic, keeping it)
                if (req.user.parent_id) {
                    where.user_id = { [Op.in]: [req.user.id, req.user.parent_id] };
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato sees records for contractors they are assigned to
                // OPTION A: Direct Assignment (ContratistaAsignacion)
                // OPTION B: Linked via Vinculacion (Administracion)

                // 1. Get assignments via ContratistaAsignacion
                const asignaciones = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: req.user.id },
                    attributes: ['user_id']
                });
                let userIds = asignaciones.map(a => a.user_id);

                // 2. Get assignments via Vinculacion -> Administracion
                // Find Vinculaciones where I am the ADC
                const misAdmins = await Administracion.findAll({
                    where: { administrador_contrato_id: req.user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = misAdmins.map(a => a.vinculacion_id);

                if (vincIds.length > 0) {
                    // Find Records that belong to these vinculaciones
                    // There is no direct 'vinculacion_id' on Registro? Yes there is: 'contratista_asignacion_id' pointing to Vinculacion table (renamed logically?)
                    // Wait, schema says 'contratista_asignacion_id' refers to 'vinculaciones' OR 'contratista_asignaciones'?
                    // The model definition for Registro says: 
                    // Registro.belongsTo(Vinculacion, { foreignKey: 'contratista_asignacion_id', as: 'vinculacionEntidad' });
                    // Registro.belongsTo(ContratistaAsignacion, { foreignKey: 'contratista_asignacion_id', as: 'asignacion' });
                    // It seems it's the SAME FK being used for both concepts depending on context? That's messy but let's assume 'vinculacionEntidad' usage.

                    // If we want records linked to my Vinculaciones:
                    // where.contratista_asignacion_id = { [Op.in]: vincIds }; 

                    // BUT, we also want records from direct users.
                    // So it's OR condition.

                    where[Op.or] = [
                        { user_id: { [Op.in]: userIds } },
                        { contratista_asignacion_id: { [Op.in]: vincIds } } // Assuming this ID matches Vinculacion.ID
                    ];
                } else {
                    where.user_id = { [Op.in]: userIds };
                }
            }
            // Admin sees all (no filter)

            // hierarchy filters (Gerencia - Subgerencia)
            const { gerencia_id, subgerencia_id } = req.query;
            if (subgerencia_id && subgerencia_id !== 'todas') {
                const subVincs = await Vinculacion.findAll({
                    where: { subgerencia_id, activo: 1 },
                    attributes: ['id']
                });
                const subVincIds = subVincs.map(v => v.id);
                if (where.contratista_asignacion_id && where.contratista_asignacion_id[Op.in]) {
                    const currentIds = where.contratista_asignacion_id[Op.in];
                    const intersection = currentIds.filter(id => subVincIds.includes(id));
                    where.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    where.contratista_asignacion_id = { [Op.in]: subVincIds.length > 0 ? subVincIds : [-1] };
                }
            } else if (gerencia_id && gerencia_id !== 'todas') {
                const subs = await Subgerencia.findAll({
                    where: { gerencia_id, activo: 1 },
                    attributes: ['id']
                });
                const subIds = subs.map(s => s.id);
                const subVincs = await Vinculacion.findAll({
                    where: { subgerencia_id: { [Op.in]: subIds.length > 0 ? subIds : [-1] }, activo: 1 },
                    attributes: ['id']
                });
                const gerVincIds = subVincs.map(v => v.id);
                if (where.contratista_asignacion_id && where.contratista_asignacion_id[Op.in]) {
                    const currentIds = where.contratista_asignacion_id[Op.in];
                    const intersection = currentIds.filter(id => gerVincIds.includes(id));
                    where.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    where.contratista_asignacion_id = { [Op.in]: gerVincIds.length > 0 ? gerVincIds : [-1] };
                }
            }

            // Filter by status if provided
            const { estado_auditoria } = req.query;
            if (estado_auditoria) {
                if (estado_auditoria.includes(',')) {
                    where.estado_auditoria = { [Op.in]: estado_auditoria.split(',') };
                } else {
                    where.estado_auditoria = estado_auditoria;
                }
            }

            const registros = await Registro.findAll({
                where,
                include: [
                    { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'eecc_nombre', 'rut'] },
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: Programa, as: 'programa', attributes: ['id', 'nombre'] },
                    {
                        model: Vinculacion,
                        as: 'asignacion',
                        include: [
                            { model: TipoContratista, as: 'servicio' },
                            { model: Dependencia, as: 'dependencia' }
                        ]
                    },
                    {
                        model: Vinculacion,
                        as: 'vinculacionEntidad',
                        include: [
                            { model: TipoContratista, as: 'servicio' },
                            { 
                                model: Dependencia, 
                                as: 'dependencia',
                                include: [{
                                    model: Subgerencia,
                                    as: 'subgerencia',
                                    include: [{ model: Gerencia, as: 'gerencia' }]
                                }]
                            },
                            {
                                model: Administracion,
                                as: 'administraciones',
                                include: [{ model: User, as: 'administradorContrato', attributes: ['id', 'name'] }]
                            },
                        ]
                    }
                ],
                order: [['periodo', 'DESC'], ['id', 'DESC']]
            });

            res.json({ success: true, data: registros });
        } catch (error) {
            console.error('Registros index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener registros' });
        }
    },

    // GET /api/registros/:id
    async show(req, res) {
        try {
            const registro = await Registro.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'eecc_nombre', 'rut'] },
                    { model: RegistroLog, as: 'logs', include: [{ model: User, as: 'usuario', attributes: ['name', 'role'] }] },
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: Programa, as: 'programa', attributes: ['id', 'nombre'] },
                    { model: Vinculacion, as: 'vinculacionEntidad' },
                    {
                        model: Vinculacion,
                        as: 'asignacion',
                        include: [
                            { model: TipoContratista, as: 'servicio' },
                            { model: Dependencia, as: 'dependencia' }
                        ]
                    },
                    {
                        model: RegistroActividad,
                        as: 'actividades',
                        include: [
                            {
                                model: Actividad,
                                as: 'actividad',
                                include: [{ model: Elemento, as: 'elemento' }]
                            },
                            {
                                model: Evidencia,
                                as: 'evidencias',
                                attributes: ['id', 'ruta', 'nombre_archivo', 'nombre_original']
                            },
                            {
                                model: Hallazgo,
                                as: 'hallazgos',
                                attributes: ['id', 'tipo', 'descripcion', 'estado']
                            }
                        ]
                    },

                ]
            });

            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            res.json({ success: true, data: registro });
        } catch (error) {
            console.error('Registro show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener registro' });
        }
    },

    // POST /api/registros
    async store(req, res) {
        try {
            const {
                contratista_asignacion_id,
                periodo,
                personas_nuevas = 0,
                supervisores = 0,
                prevencionistas = 0,
                dotacion_total = 0,
                actividades = []
            } = req.body;

            if (!periodo) {
                return res.status(400).json({ success: false, message: 'El periodo es requerido' });
            }

            let targetUserId = req.user.id;
            let eeccNombre = null;
            let depNombre = null;
            let depId = null;
            let numContrato = null;


            // Accept contratista_id (company entity) from the form
            const contratistaId = req.body.contratista_id;

            if (contratistaId) {
                // Look up Contratista company
                const empresa = await Contratista.findByPk(contratistaId);
                if (!empresa) {
                    return res.status(404).json({ success: false, message: 'Empresa contratista no encontrada' });
                }
                eeccNombre = empresa.nombre;
            }

            // Validate vinculacion (stored as contratista_asignacion_id)
            if (contratista_asignacion_id) {
                const vinculacion = await Vinculacion.findOne({
                    where: { id: contratista_asignacion_id, ...(contratistaId ? { contratista_id: contratistaId } : {}) },
                    include: [
                        { model: Dependencia, as: 'dependencia' },
                        { model: TipoContratista, as: 'servicio' }
                    ]
                });
                if (!vinculacion) {
                    return res.status(400).json({ success: false, message: 'La vinculación seleccionada no pertenece al contratista' });
                }
                depNombre = vinculacion.dependencia?.nombre || null;
                depId = vinculacion.dependencia_id || null;
                numContrato = vinculacion.numero_contrato || null;

                if (!eeccNombre && vinculacion.contratista_id) {
                    const emp = await Contratista.findByPk(vinculacion.contratista_id);
                    eeccNombre = emp?.nombre || null;
                }
            }

            // Prevent duplicate: same vinculacion + periodo
            if (contratista_asignacion_id && periodo) {
                const existing = await Registro.findOne({
                    where: { contratista_asignacion_id, periodo }
                });
                if (existing) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe un registro para esta vinculación en el periodo seleccionado'
                    });
                }
            }

            const registro = await Registro.create({
                user_id: targetUserId,
                contratista_asignacion_id,
                numero_contrato: numContrato,

                programa_id: req.body.programa_id || null,
                dependencia_id: depId || req.body.dependencia_id || null,
                periodo,
                eecc_nombre: eeccNombre, // Company name from Contratista entity
                dependencia: depNombre, // From Vinculacion's Dependencia
                personas_nuevas,
                supervisores,
                prevencionistas,
                dotacion_total,
                porcentaje_cumplimiento: 0,
                estado_auditoria: 'pendiente',
                cerrado: 0,
                auditado: 0
            });

            // Create registro actividades if provided
            if (actividades.length > 0) {
                for (const act of actividades) {
                    await RegistroActividad.create({
                        registro_id: registro.id,
                        actividad_id: act.actividad_id,
                        cumple: act.cumple,
                        responsable: act.responsable,
                        descripcion_contratista: act.descripcion_contratista
                    });
                }

                // Calculate percentage (Contractor)
                // Note: Currently contractors don't have N/A, but we future-proof it.
                const applicableActsCount = actividades.filter(a => a.cumple !== 2).length;
                const cumplidas = actividades.filter(a => a.cumple === 1 || a.cumple === true).length;
                const porcentaje = applicableActsCount > 0 ? (cumplidas / applicableActsCount) * 100 : 0;
                await registro.update({ porcentaje_cumplimiento: porcentaje.toFixed(2) });
            }

            // Log creation
            await RegistroLog.create({
                registro_id: registro.id,
                user_id: req.user.id,
                accion: 'CREAR',
                descripcion: 'Registro creado',
                datos_nuevos: { periodo, dotacion_total },
                ip_address: req.ip
            });

            // Notify Admin via Email (Mock)
            // Assuming we have a way to get admin emails, for now just log
            // const admins = await User.findAll({ where: { role: 'admin' } });
            // emails = admins.map(u => u.email);
            // await emailService.send(emails, 'Nuevo Registro Creado', `Registro del periodo ${periodo} creado por ${user.name}`);
            console.log(`[MOCK EMAIL] Nuevo Registro Creado: ${registro.periodo} - ${req.user.name}`);

            res.status(201).json({ success: true, data: registro });
        } catch (error) {
            console.error('Registro store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear registro' });
        }
    },

    // PUT /api/registros/:id
    async update(req, res) {
        try {
            const registro = await Registro.findByPk(req.params.id);

            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            // Can't edit if already audited (unless in creation or subsanation phase)
            // Contractors only allowed in 'pendiente' or 'pendiente_subsanacion'
            const isContractor = ['contratista_admin', 'contratista_user'].includes(req.user.role);
            if (isContractor && !['pendiente', 'pendiente_subsanacion'].includes(registro.estado_auditoria)) {
                return res.status(403).json({
                    success: false,
                    message: 'No se puede editar el registro en el estado actual'
                });
            }

            if (['auditada', 'finalizado'].includes(registro.estado_auditoria) && !isContractor) {
                return res.status(403).json({
                    success: false,
                    message: 'No se puede editar un registro finalizado'
                });
            }

            const oldData = registro.toJSON();
            const { actividades, terminar_subsanacion, ...registroData } = req.body;

            // Transition to 'subsanado' automatically if edited while in subsanation phase
            if (registro.estado_auditoria === 'pendiente_subsanacion') {
                registroData.estado_auditoria = 'subsanado';
            }
            
            // Compatibility for old 'reabierto' state if any exists
            if (registro.estado_auditoria === 'reabierto') {
                registroData.estado_auditoria = 'subsanado';
            }

            // CHECK: Mandatory Evidence before closing
            if (registroData.cerrado === 1 && oldData.cerrado === 0) {
                // Get mandatory activities
                const actividadesRequeridas = await RegistroActividad.findAll({
                    where: { registro_id: registro.id, cumple: [1, true] }, // Only those marked as "Cumple"
                    include: [{
                        model: Actividad,
                        as: 'actividad',
                        where: { requiere_evidencia: 1 }
                    }]
                });

                if (actividadesRequeridas.length > 0) {
                    const reqActIds = actividadesRequeridas.map(a => a.id);
                    
                    // Get evidences linked directly to these RegistroActividad IDs
                    const evidencias = await Evidencia.findAll({
                        where: { registro_actividad_id: { [Op.in]: reqActIds } }
                    });

                    // Map covered RegistroActividad IDs
                    const coveredActIds = evidencias.map(e => e.registro_actividad_id);
                    
                    // Find if any required RegistroActividad ID lacks an evidence
                    const missingActivities = actividadesRequeridas.filter(ra => !coveredActIds.includes(ra.id));

                    if (missingActivities.length > 0) {
                        const codigosFaltantes = missingActivities.map(a => a.actividad.codigo).join(', ');
                        return res.status(400).json({
                            success: false,
                            message: `⚠️ No se puede cerrar el registro: Faltan evidencias obligatorias para las actividades [${codigosFaltantes}]. Por favor, adjunte los documentos requeridos antes de finalizar.`,
                            missingActivities: missingActivities.map(a => a.id)
                        });
                    }
                }

                // Notify Auditor (Simulated: Send to generic auditor or fetch based on assignment if possible)
                // For MVP, we send to a fixed auditor email or admin
                console.log(`[MOCK EMAIL] Registro Enviado/Cerrado: ${registro.periodo}`);
                await emailService.notifyRegistroEnviado(registro, 'ana.auditora@abastible.cl');
            }

            await registro.update(registroData);

            // Update actividades if provided
            if (actividades && actividades.length > 0) {
                for (const act of actividades) {
                    // PARKO Validation: If setting to "Cumple" and requires evidence, check presence
                    if (act.cumple === true || act.cumple === 1) {
                        const baseAct = await Actividad.findByPk(act.actividad_id);
                        if (baseAct && baseAct.requiere_evidencia) {
                            // Check if there are ALREADY evidences for this RA
                            // If act.id is null (new RA during update?), then it definitely has no evidence yet.
                            let evidenceExists = false;
                            if (act.id) {
                                const count = await Evidencia.count({ where: { registro_actividad_id: act.id } });
                                evidenceExists = count > 0;
                            }

                            if (!evidenceExists) {
                                return res.status(400).json({
                                    success: false,
                                    message: `La actividad ${baseAct.codigo} requiere evidencia para ser marcada como "Cumple".`
                                });
                            }
                        }
                    }

                    if (act.id) {
                        await RegistroActividad.update(act, { where: { id: act.id } });
                    } else {
                        await RegistroActividad.create({ ...act, registro_id: registro.id });
                    }
                }

                // Recalculate percentage (Contractor)
                const allActs = await RegistroActividad.findAll({ where: { registro_id: registro.id } });
                const applicableActs = allActs.filter(a => a.cumple !== 2);
                const cumplidasCount = applicableActs.filter(a => a.cumple === true || a.cumple === 1).length;
                const porcentaje = applicableActs.length > 0 ? (cumplidasCount / applicableActs.length) * 100 : 0;

                // Recalculate percentage (Auditor)
                // Standard: Only include activities that have been audited (not null) AND are not N/A (2).
                const auditedApplicableActs = allActs.filter(a => a.cumple_auditor !== null && a.cumple_auditor !== 2);
                const totalAuditedApplicable = auditedApplicableActs.length;
                const cumplidasAuditor = auditedApplicableActs.filter(a => a.cumple_auditor === 1 || a.cumple_auditor === true).length;

                const porcentajeAuditor = totalAuditedApplicable > 0 ? (cumplidasAuditor / totalAuditedApplicable) * 100 : 0;

                await registro.update({
                    porcentaje_cumplimiento: porcentaje.toFixed(2),
                    porcentaje_cumplimiento_auditor: totalAuditedApplicable > 0 ? porcentajeAuditor.toFixed(2) : null
                });
            }

            // Log update
            await RegistroLog.create({
                registro_id: registro.id,
                user_id: req.user.id,
                accion: 'EDITAR',
                descripcion: 'Registro editado',
                datos_anteriores: oldData,
                datos_nuevos: registro.toJSON(),
                ip_address: req.ip
            });

            res.json({ success: true, data: registro });
        } catch (error) {
            console.error('Registro update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar registro' });
        }
    },

    // DELETE /api/registros/:id (Solo Admin - RN-001)
    // DELETE /api/registros/:id (Solo Admin - RN-001)
    async destroy(req, res) {
        const t = await Registro.sequelize.transaction();
        try {
            const registro = await Registro.findByPk(req.params.id);

            if (!registro) {
                await t.rollback();
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            // 1. Delete Dependencies (Reverse topological order of dependencies)

            // A. Evidencias (Depends on RegistroActividad)
            const actividades = await RegistroActividad.findAll({
                where: { registro_id: registro.id },
                attributes: ['id'],
                transaction: t
            });
            const actividadIds = actividades.map(a => a.id);

            if (actividadIds.length > 0) {
                await Evidencia.destroy({
                    where: { registro_actividad_id: { [Op.in]: actividadIds } },
                    transaction: t
                });
            }

            // B. Compromisos (Depends on Hallazgo and Registro)
            const Compromiso = require('../database/models').Compromiso;
            if (Compromiso) {
                await Compromiso.destroy({ where: { registro_id: registro.id }, transaction: t });
            }

            // C. Hallazgos (Depends on RegistroActividad and Registro)
            await Hallazgo.destroy({ where: { registro_id: registro.id }, transaction: t });

            // D. RegistroActividades (Depends on Registro)
            await RegistroActividad.destroy({ where: { registro_id: registro.id }, transaction: t });

            // E. Logs (Depends on Registro)
            await RegistroLog.destroy({ where: { registro_id: registro.id }, transaction: t });

            // 2. Delete Parent
            await registro.destroy({ transaction: t });

            await t.commit();
            res.json({ success: true, message: 'Registro eliminado correctamente' });
        } catch (error) {
            await t.rollback();
            console.error('Registro destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar registro: ' + error.message });
        }
    }
};

module.exports = registroController;
