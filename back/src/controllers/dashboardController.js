// IEEE Trace: REQ-008 | US-008 | dashboardController.js
const { Op } = require('sequelize');
const {
    Registro,
    RegistroActividad,
    User,
    Programa,
    Compromiso,
    SolicitudReapertura,
    Hallazgo,
    ContratistaAsignacion,
    Evidencia,
    Vinculacion,
    Contratista,
    TipoContratista,
    Dependencia,
    Administracion,
    Gerencia,
    Subgerencia,
    sequelize
} = require('../database/models');

const dashboardController = {
    // GET /api/dashboard/kpis
    async kpis(req, res) {
        try {
            const user = req.user;
            const now = new Date();
            const isContractor = ['contratista_admin', 'contratista_user'].includes(user.role);
            const isContractManager = user.role === 'administrador_contrato';

            // Determine scope filters
            const whereRegistro = {};

            // 1. Get Vinculacion IDs based on role
            let scopeVinculacionIds = [];

            if (user.role === 'administrador_contrato') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                scopeVinculacionIds = adminRecords.map(a => a.vinculacion_id);
                if (scopeVinculacionIds.length === 0) whereRegistro.id = -1;
                else whereRegistro.contratista_asignacion_id = { [Op.in]: scopeVinculacionIds };
            } else if (user.role === 'contratista_admin') {
                if (user.contratista_id) {
                    const vincs = await Vinculacion.findAll({
                        where: { contratista_id: user.contratista_id, activo: 1 },
                        attributes: ['id']
                    });
                    scopeVinculacionIds = vincs.map(v => v.id);
                    if (scopeVinculacionIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: scopeVinculacionIds };
                } else {
                    whereRegistro.id = -1;
                }
            } else if (user.role === 'contratista_user') {
                if (user.contratista_id && user.tipo_contratista_id && user.dependencia_id) {
                    const vincs = await Vinculacion.findAll({
                        where: {
                            contratista_id: user.contratista_id,
                            servicio_id: user.tipo_contratista_id,
                            dependencia_id: user.dependencia_id,
                            activo: 1
                        },
                        attributes: ['id']
                    });
                    scopeVinculacionIds = vincs.map(v => v.id);
                    if (scopeVinculacionIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: scopeVinculacionIds };
                } else {
                    whereRegistro.id = -1;
                }
            }

            const { fecha_inicio, fecha_fin, programa_id, servicio_id, dependencia_id, search, estado, gerencia_id, subgerencia_id, adc_id } = req.query;

            // Filtros Avanzados (Intersección de Scope)
            // 1. Filtro por ADC (Administrador de Contrato)
            if (adc_id && adc_id !== 'todos') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: adc_id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIdsFromADC = adminRecords.map(a => a.vinculacion_id);
                if (whereRegistro.contratista_asignacion_id) {
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromADC.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromADC.length > 0 ? vincIdsFromADC : [-1] };
                }
            }

            // 2. Filtro por Gerencia / Subgerencia
            if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
                const depWhere = {};
                if (subgerencia_id && subgerencia_id !== 'todas') {
                    depWhere.subgerencia_id = subgerencia_id;
                } else if (gerencia_id && gerencia_id !== 'todas') {
                    // Si se seleccionó gerencia pero no subgerencia, buscar todas las subgerencias de esa gerencia
                    const subgs = await Subgerencia.findAll({
                        where: { gerencia_id: gerencia_id, activo: 1 },
                        attributes: ['id']
                    });
                    const subgIds = subgs.map(s => s.id);
                    depWhere.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
                }

                const depsInGerencia = await Dependencia.findAll({
                    where: depWhere,
                    attributes: ['id']
                });
                const depIdsInGerencia = depsInGerencia.map(d => d.id);

                const vincsInGerencia = await Vinculacion.findAll({
                    where: { dependencia_id: { [Op.in]: depIdsInGerencia.length > 0 ? depIdsInGerencia : [-1] }, activo: 1 },
                    attributes: ['id']
                });
                const vincIdsFromGerencia = vincsInGerencia.map(v => v.id);

                if (whereRegistro.contratista_asignacion_id) {
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromGerencia.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromGerencia.length > 0 ? vincIdsFromGerencia : [-1] };
                }
            }

            // Date Filter
            if (fecha_inicio || fecha_fin) {
                const dateFilter = {};
                if (fecha_inicio) {
                    const startDate = new Date(fecha_inicio + '-01'); // Assuming YYYY-MM
                    dateFilter[Op.gte] = startDate;
                }
                if (fecha_fin) {
                    const d = new Date(fecha_fin + '-01');
                    d.setMonth(d.getMonth() + 1);
                    dateFilter[Op.lt] = d;
                }
                whereRegistro.periodo = dateFilter;
            }

            // Specific Filters (Intersection with scope)
            if (programa_id && programa_id !== 'todos') {
                whereRegistro.programa_id = programa_id;
            }

            if (dependencia_id && dependencia_id !== 'todas') {
                whereRegistro.dependencia_id = dependencia_id;
            }

            // Search Filter (Company Name) - Use include to filter by company name properly or use Registro.eecc_nombre
            if (search) {
                whereRegistro.eecc_nombre = { [Op.like]: `%${search}%` };
            }

            // Service Filter 
            if (servicio_id && servicio_id !== 'todos') {
                const vincsWithService = await Vinculacion.findAll({
                    where: { servicio_id: servicio_id, activo: 1 },
                    attributes: ['id']
                });
                const serviceVincIds = vincsWithService.map(v => v.id);

                if (whereRegistro.contratista_asignacion_id) {
                    // Intersect with existing scope
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => serviceVincIds.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: serviceVincIds.length > 0 ? serviceVincIds : [-1] };
                }
            }

            // Total registros
            const totalRegistros = await Registro.count({ where: whereRegistro });

            // Registros pendientes auditoría
            const pendientesAuditoria = await Registro.count({
                where: { ...whereRegistro, estado_auditoria: 'pendiente' }
            });

            // Registros auditados (Total)
            const auditados = await Registro.count({
                where: {
                    ...whereRegistro,
                    estado_auditoria: 'auditada'
                }
            });

            // Auditados Breakdown
            const auditadosTerreno = await Registro.count({
                where: { ...whereRegistro, estado_auditoria: 'auditada', tipo_auditoria: 'terreno' }
            });

            const auditadosSistema = await Registro.count({
                where: { ...whereRegistro, estado_auditoria: 'auditada', tipo_auditoria: 'sistema' }
            });

            // Promedio cumplimiento general
            const avgCumplimiento = await Registro.findOne({
                where: whereRegistro,
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedio'],
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento_auditor')), 'promedioAuditado']
                ],
                raw: true
            });

            // Total Evidencias (Joined via RegistroActividad -> Registro)
            const totalEvidencias = await Evidencia.count({
                include: [{
                    model: RegistroActividad,
                    as: 'registroActividad',
                    required: true,
                    include: [{
                        model: Registro,
                        as: 'registro',
                        where: whereRegistro,
                        required: true
                    }]
                }]
            });

            // Compromisos vencidos (Filter by Register's Company)
            const compromisosVencidos = await Compromiso.count({
                include: [{
                    model: Registro,
                    as: 'registro',
                    where: whereRegistro,
                    required: true
                }],
                where: {
                    estado: { [Op.in]: ['pendiente', 'en_proceso'] },
                    fecha_compromiso: { [Op.lt]: now }
                }
            });

            // Hallazgos abiertos (Filter by Register's Company)
            const hallazgosAbiertos = await Hallazgo.count({
                include: [{
                    model: Registro,
                    as: 'registro',
                    where: whereRegistro,
                    required: true
                }],
                where: { estado: 'abierto' }
            });

            // Reaperturas pendientes (Filter by Register's Company)
            const reapeturasPendientes = await SolicitudReapertura.count({
                include: [{
                    model: Registro,
                    as: 'registro',
                    where: whereRegistro,
                    required: true
                }],
                where: { estado: 'pendiente' }
            });

            // Usuarios activos (Global for Admins, nothing for Contractors usually, or maybe their own users?)
            // For now, let's show global for Admins and 0 or specific for contractors.
            // Contractors don't really manage users in this MVP scope except maybe their operatives.
            const usuariosActivos = isContractor ? 0 : await User.count({ where: { activo: true } });

            // NUEVO KPI: % EECC con Registro (Empresas con al menos 1 registro en el periodo / Total Empresas Activas en el scope)
            let totalEECCActivasEnScope = 0;
            if (whereRegistro.contratista_asignacion_id) {
                // Si hay un scope de IDs in (ej un filtro o rol)
                const ids = whereRegistro.contratista_asignacion_id[Op.in] || [];
                if (ids.length && ids[0] !== -1) {
                    totalEECCActivasEnScope = ids.length;
                }
            } else {
                // Scope global (Admin sin filtros de cascada específicos)
                totalEECCActivasEnScope = await Vinculacion.count({ where: { activo: 1 } });
            }

            const eeccConRegistroDistinct = await Registro.count({
                where: whereRegistro,
                col: 'contratista_asignacion_id',
                distinct: true
            });

            const porcentajeEmpresasConRegistro = totalEECCActivasEnScope > 0
                ? ((eeccConRegistroDistinct / totalEECCActivasEnScope) * 100).toFixed(1)
                : 0;

            // Metadata de colores para leyenda (OK >= 85, Alerta < 85, Grave < 70)
            const colorLegend = {
                optimo: { label: 'Óptimo', color: '#10b981', min: 85 },
                alerta: { label: 'Alerta', color: '#f59e0b', min: 70 },
                critico: { label: 'Crítico', color: '#ef4444', min: 0 }
            };

            res.json({
                success: true,
                data: {
                    totalRegistros,
                    pendientesAuditoria,
                    auditados,
                    auditadosTerreno,
                    auditadosSistema,
                    totalEvidencias,
                    promedioCumplimiento: parseFloat(avgCumplimiento?.promedio || 0).toFixed(1),
                    promedioCumplimientoAuditor: avgCumplimiento?.promedioAuditado !== null
                        ? parseFloat(avgCumplimiento.promedioAuditado).toFixed(1)
                        : null,
                    porcentajeEmpresasConRegistro,
                    compromisosVencidos,
                    hallazgosAbiertos,
                    reapeturasPendientes,
                    usuariosActivos,
                    colorLegend, // Enviar metadata de colores al front
                    roleView: isContractor ? 'Contractor' : isContractManager ? 'ContractManager' : 'Global'
                }
            });
        } catch (error) {
            console.error('Dashboard KPIs error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener KPIs' });
        }
    },

    // GET /api/dashboard/cumplimiento
    async cumplimiento(req, res) {
        try {
            const user = req.user;
            let vincWhere = { activo: 1 };
            const { gerencia_id, subgerencia_id, adc_id } = req.query;

            // 1. Base Role
            if (user.role === 'administrador_contrato') {
                const adminVincs = await Administracion.findAll({
                    where: { administrador_contrato_id: user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                vincWhere.id = { [Op.in]: adminVincs.map(a => a.vinculacion_id) };
            } else if (user.role === 'contratista_admin') {
                vincWhere.contratista_id = user.contratista_id;
            } else if (user.role === 'contratista_user') {
                vincWhere.contratista_id = user.contratista_id;
                vincWhere.servicio_id = user.tipo_contratista_id;
                vincWhere.dependencia_id = user.dependencia_id;
            }

            // 2. Filtros Avanzados
            if (adc_id && adc_id !== 'todos') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: adc_id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIdsFromADC = adminRecords.map(a => a.vinculacion_id);
                if (vincWhere.id) {
                    const existingIds = vincWhere.id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromADC.includes(id));
                    vincWhere.id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    vincWhere.id = { [Op.in]: vincIdsFromADC.length > 0 ? vincIdsFromADC : [-1] };
                }
            }

            if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
                const depWhere = {};
                if (subgerencia_id && subgerencia_id !== 'todas') {
                    depWhere.subgerencia_id = subgerencia_id;
                } else if (gerencia_id && gerencia_id !== 'todas') {
                    const subgs = await Subgerencia.findAll({
                        where: { gerencia_id: gerencia_id, activo: 1 },
                        attributes: ['id']
                    });
                    const subgIds = subgs.map(s => s.id);
                    depWhere.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
                }

                const depsInGerencia = await Dependencia.findAll({
                    where: depWhere,
                    attributes: ['id']
                });
                const depIdsInGerencia = depsInGerencia.map(d => d.id);
                
                if (vincWhere.dependencia_id) {
                    // Si ya habia scope de dependencia, intersectamos (contratista_user)
                    if (!depIdsInGerencia.includes(vincWhere.dependencia_id)) {
                        vincWhere.dependencia_id = -1; // Filtro no concuerda
                    }
                } else {
                    vincWhere.dependencia_id = { [Op.in]: depIdsInGerencia.length > 0 ? depIdsInGerencia : [-1] };
                }
            }

            const data = await Registro.findAll({
                attributes: [
                    'contratista_asignacion_id',
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedio'],
                    [sequelize.fn('COUNT', sequelize.col('Registro.id')), 'total']
                ],
                include: [
                    {
                        model: Vinculacion,
                        as: 'vinculacionEntidad',
                        where: vincWhere,
                        include: [{ model: Contratista, as: 'contratista', attributes: ['id', 'nombre'] }]
                    }
                ],
                group: ['contratista_asignacion_id'],
                raw: true,
                nest: true
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Dashboard cumplimiento error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener datos' });
        }
    },

    // GET /api/dashboard/actividad-reciente
    async actividadReciente(req, res) {
        try {
            const user = req.user;
            const { gerencia_id, subgerencia_id, adc_id } = req.query;
            const whereRegistro = {};

            // Same robust scoping as kpis
            if (user.role === 'administrador_contrato') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = adminRecords.map(a => a.vinculacion_id);
                if (vincIds.length === 0) whereRegistro.id = -1;
                else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
            } else if (user.role === 'contratista_admin') {
                if (user.contratista_id) {
                    const vincs = await Vinculacion.findAll({
                        where: { contratista_id: user.contratista_id, activo: 1 },
                        attributes: ['id']
                    });
                    const vincIds = vincs.map(v => v.id);
                    if (vincIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
                } else {
                    whereRegistro.id = -1;
                }
            } else if (user.role === 'contratista_user') {
                if (user.contratista_id && user.tipo_contratista_id && user.dependencia_id) {
                    const vincs = await Vinculacion.findAll({
                        where: {
                            contratista_id: user.contratista_id,
                            servicio_id: user.tipo_contratista_id,
                            dependencia_id: user.dependencia_id,
                            activo: 1
                        },
                        attributes: ['id']
                    });
                    const vincIds = vincs.map(v => v.id);
                    if (vincIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
                } else {
                    whereRegistro.id = -1;
                }
            }

            // Filtros Avanzados
            if (adc_id && adc_id !== 'todos') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: adc_id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIdsFromADC = adminRecords.map(a => a.vinculacion_id);
                if (whereRegistro.contratista_asignacion_id) {
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromADC.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromADC.length > 0 ? vincIdsFromADC : [-1] };
                }
            }

            if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
                const depWhere = {};
                if (subgerencia_id && subgerencia_id !== 'todas') {
                    depWhere.subgerencia_id = subgerencia_id;
                } else if (gerencia_id && gerencia_id !== 'todas') {
                    const subgs = await Subgerencia.findAll({
                        where: { gerencia_id: gerencia_id, activo: 1 },
                        attributes: ['id']
                    });
                    const subgIds = subgs.map(s => s.id);
                    depWhere.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
                }

                const depsInGerencia = await Dependencia.findAll({
                    where: depWhere,
                    attributes: ['id']
                });
                const depIdsInGerencia = depsInGerencia.map(d => d.id);

                const vincsInGerencia = await Vinculacion.findAll({
                    where: { dependencia_id: { [Op.in]: depIdsInGerencia.length > 0 ? depIdsInGerencia : [-1] }, activo: 1 },
                    attributes: ['id']
                });
                const vincIdsFromGerencia = vincsInGerencia.map(v => v.id);

                if (whereRegistro.contratista_asignacion_id) {
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromGerencia.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromGerencia.length > 0 ? vincIdsFromGerencia : [-1] };
                }
            }

            // Recent registros
            const registrosRecientes = await Registro.findAll({
                where: whereRegistro,
                limit: 5,
                order: [['created_at', 'DESC']],
                include: [{ model: User, as: 'usuario', attributes: ['id', 'name'] }]
            });

            // Recent compromisos (filtered by scope through include)
            const compromisosRecientes = await Compromiso.findAll({
                limit: 5,
                order: [['created_at', 'DESC']],
                include: [
                    { model: User, as: 'responsable', attributes: ['id', 'name'] },
                    {
                        model: Registro,
                        as: 'registro',
                        where: whereRegistro,
                        required: true
                    }
                ]
            });

            res.json({
                success: true,
                data: {
                    registros: registrosRecientes,
                    compromisos: compromisosRecientes
                }
            });
        } catch (error) {
            console.error('Dashboard actividad error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener actividad' });
        }
    },

    // GET /api/dashboard/historico (Last 6 months)
    async historico(req, res) {
        try {
            const user = req.user;
            const { gerencia_id, subgerencia_id, adc_id } = req.query;
            const whereRegistro = {};

            // Apply same filters as KPIs
            if (user.role === 'administrador_contrato') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = adminRecords.map(a => a.vinculacion_id);
                if (vincIds.length === 0) whereRegistro.id = -1;
                else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
            } else if (user.role === 'contratista_admin') {
                if (user.contratista_id) {
                    const vincs = await Vinculacion.findAll({
                        where: { contratista_id: user.contratista_id, activo: 1 },
                        attributes: ['id']
                    });
                    const vincIds = vincs.map(v => v.id);
                    if (vincIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
                } else {
                    whereRegistro.id = -1;
                }
            } else if (user.role === 'contratista_user') {
                if (user.contratista_id && user.tipo_contratista_id && user.dependencia_id) {
                    const vincs = await Vinculacion.findAll({
                        where: {
                            contratista_id: user.contratista_id,
                            servicio_id: user.tipo_contratista_id,
                            dependencia_id: user.dependencia_id,
                            activo: 1
                        },
                        attributes: ['id']
                    });
                    const vincIds = vincs.map(v => v.id);
                    if (vincIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
                } else {
                    whereRegistro.id = -1;
                }
            }

            // Filtros Avanzados
            if (adc_id && adc_id !== 'todos') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: adc_id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIdsFromADC = adminRecords.map(a => a.vinculacion_id);
                if (whereRegistro.contratista_asignacion_id) {
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromADC.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromADC.length > 0 ? vincIdsFromADC : [-1] };
                }
            }

            if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
                const depWhere = {};
                if (subgerencia_id && subgerencia_id !== 'todas') {
                    depWhere.subgerencia_id = subgerencia_id;
                } else if (gerencia_id && gerencia_id !== 'todas') {
                    const subgs = await Subgerencia.findAll({
                        where: { gerencia_id: gerencia_id, activo: 1 },
                        attributes: ['id']
                    });
                    const subgIds = subgs.map(s => s.id);
                    depWhere.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
                }

                const depsInGerencia = await Dependencia.findAll({
                    where: depWhere,
                    attributes: ['id']
                });
                const depIdsInGerencia = depsInGerencia.map(d => d.id);

                const vincsInGerencia = await Vinculacion.findAll({
                    where: { dependencia_id: { [Op.in]: depIdsInGerencia.length > 0 ? depIdsInGerencia : [-1] }, activo: 1 },
                    attributes: ['id']
                });
                const vincIdsFromGerencia = vincsInGerencia.map(v => v.id);

                if (whereRegistro.contratista_asignacion_id) {
                    const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromGerencia.includes(id));
                    whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromGerencia.length > 0 ? vincIdsFromGerencia : [-1] };
                }
            }

            // Calculate range: Last 6 months including current
            const today = new Date();
            const months = [];
            // Generate last 6 months array (YYYY-MM)
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                // Adjust for timezone offset to ensure correct month
                // Use UTC methods to avoid local time shifts
                const year = d.getFullYear();
                const month = d.getMonth() + 1;
                const key = `${year}-${String(month).padStart(2, '0')}`;

                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const name = monthNames[d.getMonth()];

                months.push({ key, name, date: d });
            }

            const startMonth = months[0].date;

            // Query Data
            const registros = await Registro.findAll({
                where: {
                    ...whereRegistro,
                    periodo: { [Op.gte]: startMonth }
                },
                attributes: [
                    'periodo',
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedioDeclarado'],
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento_auditor')), 'promedioAuditado']
                ],
                group: ['periodo'],
                raw: true
            });

            // Map and Fill Gaps
            const data = months.map(m => {
                // Find matching record
                // Careful with date comparison. String conversion is safest.
                const record = registros.find(r => {
                    // DB DATEONLY is "YYYY-MM-DD". Substring(0,7) is "YYYY-MM".
                    const rKey = String(r.periodo).substring(0, 7);
                    return rKey === m.key;
                });

                return {
                    name: m.name,
                    declarado: record ? parseFloat(record.promedioDeclarado || 0).toFixed(1) : 0,
                    auditado: (record && record.promedioAuditado !== null)
                        ? parseFloat(record.promedioAuditado).toFixed(1)
                        : null
                };
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Dashboard historico error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener historico' });
        }
    },

    // GET /api/dashboard/matrix
    async matrix(req, res) {
        try {
            const user = req.user;
            const { contratista_id, servicio_id, dependencia_id, programa_id, tiene_registros, gerencia_id, subgerencia_id, adc_id, page = 1, limit = 5 } = req.query;

            const offset = (page - 1) * limit;

            // 1. Build Vinculacion where clause
            const whereVinculacion = { activo: 1 };

            // --- Role-based visibility ---
            if (user.role === 'administrador_contrato') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = adminRecords.map(a => a.vinculacion_id);
                whereVinculacion.id = vincIds.length > 0 ? { [Op.in]: vincIds } : -1;
            } else if (user.role === 'contratista_admin') {
                if (user.contratista_id) {
                    whereVinculacion.contratista_id = user.contratista_id;
                } else {
                    whereVinculacion.id = -1;
                }
            } else if (user.role === 'contratista_user') {
                if (user.contratista_id && user.tipo_contratista_id && user.dependencia_id) {
                    whereVinculacion.contratista_id = user.contratista_id;
                    whereVinculacion.servicio_id = user.tipo_contratista_id;
                    whereVinculacion.dependencia_id = user.dependencia_id;
                } else {
                    whereVinculacion.id = -1;
                }
            }

            // --- Query param filters ---
            if (contratista_id && contratista_id !== 'todos') {
                whereVinculacion.contratista_id = contratista_id;
            }
            if (servicio_id && servicio_id !== 'todos') {
                whereVinculacion.servicio_id = servicio_id;
            }
            if (dependencia_id && dependencia_id !== 'todas') {
                whereVinculacion.dependencia_id = dependencia_id;
            }

            // Filtros Avanzados (Intersección de Scope Vinculacion)
            if (adc_id && adc_id !== 'todos') {
                const adminRecords = await Administracion.findAll({
                    where: { administrador_contrato_id: adc_id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIdsFromADC = adminRecords.map(a => a.vinculacion_id);
                if (whereVinculacion.id) {
                    const existingIds = whereVinculacion.id[Op.in] || [];
                    const intersection = existingIds.filter(id => vincIdsFromADC.includes(id));
                    whereVinculacion.id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
                } else {
                    whereVinculacion.id = { [Op.in]: vincIdsFromADC.length > 0 ? vincIdsFromADC : [-1] };
                }
            }

            if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
                const depWhere = {};
                if (subgerencia_id && subgerencia_id !== 'todas') {
                    depWhere.subgerencia_id = subgerencia_id;
                } else if (gerencia_id && gerencia_id !== 'todas') {
                    const subgs = await Subgerencia.findAll({
                        where: { gerencia_id: gerencia_id, activo: 1 },
                        attributes: ['id']
                    });
                    const subgIds = subgs.map(s => s.id);
                    depWhere.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
                }

                const depsInGerencia = await Dependencia.findAll({
                    where: depWhere,
                    attributes: ['id']
                });
                const depIdsInGerencia = depsInGerencia.map(d => d.id);
                
                if (whereVinculacion.dependencia_id) {
                    // Interstellar scope vs chosen scope
                    if (!depIdsInGerencia.includes(whereVinculacion.dependencia_id)) {
                        whereVinculacion.dependencia_id = -1;
                    }
                } else {
                    whereVinculacion.dependencia_id = { [Op.in]: depIdsInGerencia.length > 0 ? depIdsInGerencia : [-1] };
                }
            }

            // --- Date range for registros: last 6 months ---
            const today = new Date();
            const startMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // --- Tiene Registros filter via Subquery (for accurate pagination) ---
            if (tiene_registros === 'si' || tiene_registros === 'no') {
                const subquerySql = `(
                    SELECT DISTINCT contratista_asignacion_id 
                    FROM registros 
                    WHERE periodo BETWEEN '${startMonth.toISOString().slice(0, 10)}' AND '${endMonth.toISOString().slice(0, 10)}'
                )`;

                if (tiene_registros === 'si') {
                    whereVinculacion.id = whereVinculacion.id
                        ? { [Op.and]: [whereVinculacion.id, { [Op.in]: sequelize.literal(subquerySql) }] }
                        : { [Op.in]: sequelize.literal(subquerySql) };
                } else {
                    whereVinculacion.id = whereVinculacion.id
                        ? { [Op.and]: [whereVinculacion.id, { [Op.notIn]: sequelize.literal(subquerySql) }] }
                        : { [Op.notIn]: sequelize.literal(subquerySql) };
                }
            }

            // 2. Build servicio (TipoContratista) include
            const whereServicio = { programa_id: { [Op.ne]: null } };
            const wherePrograma = {};
            if (programa_id && programa_id !== 'todos') {
                wherePrograma.id = programa_id;
            }

            // 3. Fetch vinculaciones with nested includes + Pagination
            const { count, rows: vinculaciones } = await Vinculacion.findAndCountAll({
                where: whereVinculacion,
                include: [
                    {
                        model: Contratista,
                        as: 'contratista',
                        attributes: ['id', 'nombre', 'rut']
                    },
                    {
                        model: TipoContratista,
                        as: 'servicio',
                        where: whereServicio,
                        attributes: ['id', 'nombre', 'programa_id'],
                        include: [{
                            model: Programa,
                            as: 'programa',
                            where: Object.keys(wherePrograma).length > 0 ? wherePrograma : undefined,
                            attributes: ['id', 'nombre']
                        }]
                    },
                    {
                        model: Dependencia,
                        as: 'dependencia',
                        attributes: ['id', 'nombre']
                    },
                    {
                        model: Registro,
                        as: 'registros',
                        required: false,
                        where: {
                            periodo: { [Op.between]: [startMonth, endMonth] }
                        },
                        attributes: ['id', 'periodo', 'porcentaje_cumplimiento', 'porcentaje_cumplimiento_auditor', 'estado_auditoria']
                    }
                ],
                order: [
                    ['id', 'ASC']
                ],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true // Important when using includes with limit
            });

            // 4. Build rows
            const matrixRows = vinculaciones.map(vinc => {
                const empresa = vinc.contratista || {};
                const servicio = vinc.servicio || {};
                const programa = servicio.programa || {};
                const dep = vinc.dependencia || {};
                const registros = vinc.registros || [];

                const row = {
                    id: `${vinc.id}`,
                    vinculacion_id: vinc.id,
                    contratista: empresa.nombre || 'Desconocido',
                    rut: empresa.rut || '-',
                    programa: programa.nombre || 'Sin Programa',
                    servicio: servicio.nombre || '-',
                    dependencia: dep.nombre || '-',
                    tiene_registros: registros.length > 0,
                    data: {}
                };

                registros.forEach(reg => {
                    // DB DATEONLY is "YYYY-MM-DD". Substring(0,7) is "YYYY-MM".
                    const periodoStr = String(reg.periodo).substring(0, 7);

                    row.data[periodoStr] = {
                        declarado: parseFloat(reg.porcentaje_cumplimiento || 0).toFixed(1),
                        auditado: reg.porcentaje_cumplimiento_auditor !== null
                            ? parseFloat(reg.porcentaje_cumplimiento_auditor).toFixed(1)
                            : null,
                        registroId: reg.id,
                        estado: reg.estado_auditoria
                    };
                });

                return row;
            });

            // 5. Generate columns (last 6 months)
            const columns = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const iso = d.toISOString().slice(0, 7);
                const label = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase();
                columns.push({ key: iso, label });
            }

            res.json({
                success: true,
                data: {
                    columns,
                    rows: matrixRows,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            });

        } catch (error) {
            console.error('Dashboard matrix error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener matriz' });
        }
    }
};

module.exports = dashboardController;
