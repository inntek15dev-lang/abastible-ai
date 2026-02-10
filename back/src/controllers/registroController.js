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
    Hallazgo // Import Hallazgo model
} = require('../database/models');
const emailService = require('../services/emailService'); // Import emailService

const registroController = {
    // GET /api/registros
    async index(req, res) {
        try {
            const { user, role } = req.user;
            let where = {};

            // Apply role-based filtering (RN-002)
            if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_user') {
                // Contractors only see their own records
                where.user_id = req.user.id;

                // If contratista_user, also check parent
                if (req.user.role === 'contratista_user' && req.user.parent_id) {
                    where.user_id = { [Op.in]: [req.user.id, req.user.parent_id] };
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato sees only assigned contractors
                const asignaciones = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: req.user.id },
                    attributes: ['user_id']
                });
                const userIds = asignaciones.map(a => a.user_id);
                where.user_id = { [Op.in]: userIds };
            }
            // Admin sees all (no filter)

            const registros = await Registro.findAll({
                where,
                include: [
                    { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'eecc_nombre', 'rut'] },
                    { model: User, as: 'auditor', attributes: ['id', 'name'] },
                    { model: Programa, as: 'programa', attributes: ['id', 'nombre'] },
                    {
                        model: ContratistaAsignacion,
                        as: 'asignacion',
                        include: [
                            { model: TipoContratista, as: 'tipoContratista' },
                            { model: Dependencia, as: 'dependencia' }
                        ]
                    },
                    {
                        model: RegistroActividad,
                        as: 'actividades',
                        include: [{ model: Actividad, as: 'actividad' }]
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
                    {
                        model: ContratistaAsignacion,
                        as: 'asignacion',
                        include: [
                            { model: TipoContratista, as: 'tipoContratista' },
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
                                attributes: ['id', 'ruta', 'nombre_archivo']
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

            // Get user info for denormalized fields
            const user = await User.findByPk(req.user.id, {
                include: [{ model: Dependencia, as: 'dependencia' }]
            });

            const registro = await Registro.create({
                user_id: req.user.id,
                contratista_asignacion_id,
                programa_id: req.body.programa_id || null,
                dependencia_id: req.body.dependencia_id || user.dependencia_id || null,
                periodo,
                eecc_nombre: user.eecc_nombre,
                dependencia: user.dependencia?.nombre,
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

                // Calculate percentage
                const cumplidas = actividades.filter(a => a.cumple).length;
                const porcentaje = (cumplidas / actividades.length) * 100;
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
            console.log(`[MOCK EMAIL] Nuevo Registro Creado: ${registro.periodo} - ${user.name}`);

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

            // Can't edit if already audited (unless reabierto)
            if (['auditada_terreno', 'auditada_sistema'].includes(registro.estado_auditoria)) {
                return res.status(403).json({
                    success: false,
                    message: 'No se puede editar un registro auditado'
                });
            }

            const oldData = registro.toJSON();
            const { actividades, ...registroData } = req.body;

            // CHECK: Mandatory Evidence before closing
            if (registroData.cerrado === 1 && oldData.cerrado === 0) {
                // Get mandatory activities for this schema/program
                // Since activities are dynamic per registro (copied to RegistroActividad), we check those.
                // But wait, RegistroActividad doesn't have 'requiere_evidencia' flag, it comes from Actividad.

                const actividadesRequeridas = await RegistroActividad.findAll({
                    where: { registro_id: registro.id },
                    include: [{
                        model: Actividad,
                        as: 'actividad',
                        where: { requiere_evidencia: 1 }
                    }]
                });

                if (actividadesRequeridas.length > 0) {
                    // Check if evidences exist for these activities OR generic evidences for the registro?
                    // Rule says "Evidencia obligatoria para todas las actividades". 
                    // Let's check if we have evidences linked to specific activities or if generic evidence is enough?
                    // Strict interpretation: An evidence must be linked to the activity (actividad_id).
                    // OR: At least one evidence for the registry if "evidencia_obligatoria" config is global.
                    // Let's implement Strict: Specific evidence for specific activity.

                    // Get evidences for this registro
                    const evidencias = await Evidencia.findAll({
                        where: { registro_id: registro.id }
                    });

                    // Map activity_ids covered by evidences
                    const coveredActivityIds = evidencias
                        .map(e => e.actividad_id)
                        .filter(id => id !== null);

                    const missingActivities = actividadesRequeridas.filter(ra => !coveredActivityIds.includes(ra.actividad_id));

                    // Also check if RegistroActividad table has 'evidencia_url' usage (legacy?)
                    // If your system uses 'Evidencia' model, strictly check that.

                    if (missingActivities.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: `Faltan evidencias para actividades obligatorias: ${missingActivities.map(a => a.actividad.codigo).join(', ')}`
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
                    if (act.id) {
                        await RegistroActividad.update(act, { where: { id: act.id } });
                    } else {
                        await RegistroActividad.create({ ...act, registro_id: registro.id });
                    }
                }

                // Recalculate percentage (Contractor)
                const allActs = await RegistroActividad.findAll({ where: { registro_id: registro.id } });
                const cumplidas = allActs.filter(a => a.cumple).length;
                const porcentaje = (cumplidas / allActs.length) * 100;

                // Recalculate percentage (Auditor)
                // Logic: 1 = Pass, 0 = Fail, 2 = N/A
                const auditorActs = allActs.filter(a => a.cumple_auditor !== null); // Only counted if audited? Or assume all?
                // Actually, if we use NA, we must filter them out from denominator.
                // We consider "auditable" anything that is NOT NA (2).

                // If cumple_auditor is null, we treat as 0 (Fail) or ignore? 
                // Strict: If not audited, it's pending. But for calculation, maybe assume 0 until verified?
                // For now, let's include everything except explicitly NA.

                const validActs = allActs.filter(a => a.cumple_auditor !== 2);
                const totalValid = validActs.length;
                const cumplidasAuditor = validActs.filter(a => a.cumple_auditor === 1).length;

                const porcentajeAuditor = totalValid > 0 ? (cumplidasAuditor / totalValid) * 100 : 0;

                await registro.update({
                    porcentaje_cumplimiento: porcentaje.toFixed(2),
                    porcentaje_cumplimiento_auditor: porcentajeAuditor.toFixed(2)
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
    async destroy(req, res) {
        try {
            const registro = await Registro.findByPk(req.params.id);

            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }

            await registro.destroy();

            res.json({ success: true, message: 'Registro eliminado' });
        } catch (error) {
            console.error('Registro destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar registro' });
        }
    }
};

module.exports = registroController;
