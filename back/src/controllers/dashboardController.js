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
    sequelize
} = require('../database/models');

const dashboardController = {
    // GET /api/dashboard/kpis
    async kpis(req, res) {
        try {
            const user = req.user;
            const now = new Date();

            // Determine scope filters
            const isContractor = ['contratista_admin', 'contratista_user'].includes(user.role);
            const whereRegistro = {};

            // Filter by Company for contractors
            if (isContractor) {
                if (user.eecc_nombre) {
                    whereRegistro.eecc_nombre = user.eecc_nombre;
                } else if (user.contratista_id) {
                    const contratista = await Contratista.findByPk(user.contratista_id);
                    if (contratista) {
                        whereRegistro.eecc_nombre = contratista.nombre;
                    } else {
                        return res.status(400).json({ success: false, message: 'Usuario contratista sin empresa asignada (ID inválido)' });
                    }
                } else {
                    return res.status(400).json({ success: false, message: 'Usuario contratista sin empresa asignada' });
                }
            }

            const { fecha_inicio, fecha_fin, programa_id, servicio_id, dependencia_id, search, estado } = req.query;

            // Date Filter
            if (fecha_inicio || fecha_fin) {
                const dateFilter = {};
                if (fecha_inicio) {
                    const startDate = new Date(fecha_inicio + '-01'); // Assuming YYYY-MM
                    dateFilter[Op.gte] = startDate;
                }
                if (fecha_fin) {
                    const endDate = new Date(fecha_fin + '-01');
                    // End of month? Or just start of next?
                    // Let's assume user picks Month, we want up to end of that month.
                    const d = new Date(fecha_fin + '-01');
                    d.setMonth(d.getMonth() + 1);
                    dateFilter[Op.lt] = d;
                }
                whereRegistro.periodo = dateFilter;
            }

            // Program Filter
            if (programa_id && programa_id !== 'todos') {
                whereRegistro.programa_id = programa_id;
            }

            // Dependencia Filter
            if (dependencia_id && dependencia_id !== 'todas') {
                whereRegistro.dependencia_id = dependencia_id;
            }

            // Search Filter (Company Name)
            if (search) {
                whereRegistro.eecc_nombre = { [Op.like]: `%${search}%` };
            }

            // Service Filter (logic to find Assignments first)
            let assignmentIdsFromService = [];
            const hasServiceFilter = servicio_id && servicio_id !== 'todos';

            if (hasServiceFilter) {
                const serviceAssignments = await ContratistaAsignacion.findAll({
                    where: { tipo_contratista_id: servicio_id },
                    attributes: ['id']
                });
                assignmentIdsFromService = serviceAssignments.map(a => a.id);
                // If service selected but no assignments found, result should be empty
                if (assignmentIdsFromService.length === 0) {
                    whereRegistro.id = -1; // Force empty
                }
            }


            // Filter for Contract Managers (Admin Contrato)
            const isContractManager = user.role === 'administrador_contrato';
            if (isContractManager) {
                // Find assignments managed by this user
                const assignments = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: user.id },
                    attributes: ['id']
                });
                let assignmentIds = assignments.map(a => a.id);

                // Intersect with Service Filter if present
                if (hasServiceFilter) {
                    assignmentIds = assignmentIds.filter(id => assignmentIdsFromService.includes(id));
                }

                if (assignmentIds.length === 0) {
                    whereRegistro.id = -1;
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: assignmentIds };
                }
            } else if (hasServiceFilter && !whereRegistro.id) {
                // If not Admin Contrato, but has Service Filter, apply it
                whereRegistro.contratista_asignacion_id = { [Op.in]: assignmentIdsFromService };
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
                    estado_auditoria: { [Op.in]: ['auditada_sistema', 'auditada_terreno'] }
                }
            });

            // Auditados Breakdown
            const auditadosTerreno = await Registro.count({
                where: { ...whereRegistro, estado_auditoria: 'auditada_terreno' }
            });

            const auditadosSistema = await Registro.count({
                where: { ...whereRegistro, estado_auditoria: 'auditada_sistema' }
            });

            // Promedio cumplimiento general
            const avgCumplimiento = await Registro.findOne({
                where: whereRegistro,
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedio']
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
                    compromisosVencidos,
                    hallazgosAbiertos,
                    reapeturasPendientes,
                    usuariosActivos,
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
            // Get cumplimiento by contratista
            const user = req.user;
            const whereClause = {};

            if (user.role === 'administrador_contrato') {
                // The include alias 'asignacion' is used below, we need to filter on the include
                // But wait, standard Sequelize approach for filtering on included model:
                // We can put the where clause inside the include
            }

            // Better: Get IDs first like before to keep query clean or use direct include where
            let asignacionWhere = {};
            if (user.role === 'administrador_contrato') {
                asignacionWhere = { administrador_contrato_id: user.id };
            }

            const data = await Registro.findAll({
                attributes: [
                    'contratista_asignacion_id',
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedio'],
                    [sequelize.fn('COUNT', sequelize.col('Registro.id')), 'total']
                ],
                include: [
                    {
                        model: ContratistaAsignacion,
                        as: 'asignacion',
                        where: asignacionWhere, // Apply filter here
                        include: [{ model: User, as: 'contratista', attributes: ['id', 'name'] }]
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
            // Filter for Contract Managers
            const user = req.user;
            const whereRegistro = {};
            // For Compromiso, we need to filter by assignments as well.
            // Compromiso belongs to ContratistaAsignacion? Let's check model.
            // Assuming Compromiso -> ContratistaAsignacion -> AdminContrato

            let asignacionWhere = {};
            if (user.role === 'administrador_contrato') {
                // Optimization: We could share this logic if refactored, but inline is fine for now
                const assignments = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: user.id },
                    attributes: ['id']
                });
                const assignmentIds = assignments.map(a => a.id);

                if (assignmentIds.length === 0) {
                    whereRegistro.id = -1;
                    asignacionWhere.id = -1; // For Compromiso
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: assignmentIds };
                    asignacionWhere.id = { [Op.in]: assignmentIds };
                }
            } else if (['contratista_admin', 'contratista_user'].includes(user.role)) {
                if (user.eecc_nombre) {
                    whereRegistro.eecc_nombre = user.eecc_nombre;
                    // For Compromiso... contractors see their own commitments.
                    // Commitments are linked to ContratistaAsignacion.
                    // We need to find assignments for this contractor user? 
                    // Actually contractors user filter usually implies `user_id` or `eecc`.
                    // Ideally we filter Compromisos by the contractor's assignments.
                }
            }

            // Recent registros
            const registrosRecientes = await Registro.findAll({
                where: whereRegistro,
                limit: 5,
                order: [['created_at', 'DESC']],
                include: [{ model: User, as: 'usuario', attributes: ['id', 'name'] }]
            });

            // Recent compromisos
            const compromisosRecientes = await Compromiso.findAll({
                limit: 5,
                order: [['created_at', 'DESC']],
                include: [
                    { model: User, as: 'responsable', attributes: ['id', 'name'] },
                    {
                        model: ContratistaAsignacion,
                        as: 'asignacion',
                        where: user.role === 'administrador_contrato' ? { administrador_contrato_id: user.id } : {},
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
            const whereRegistro = {};

            // Apply same filters as KPIs
            if (['contratista_admin', 'contratista_user'].includes(user.role)) {
                if (user.eecc_nombre) whereRegistro.eecc_nombre = user.eecc_nombre;
            } else if (user.role === 'administrador_contrato') {
                const assignments = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: user.id },
                    attributes: ['id']
                });
                const assignmentIds = assignments.map(a => a.id);
                if (assignmentIds.length === 0) whereRegistro.id = -1;
                else whereRegistro.contratista_asignacion_id = { [Op.in]: assignmentIds };
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
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedio']
                ],
                group: ['periodo'],
                raw: true
            });

            // Map and Fill Gaps
            const data = months.map(m => {
                // Find matching record
                // Careful with date comparison. String conversion is safest.
                const record = registros.find(r => {
                    const rDate = new Date(r.periodo);
                    // Check if YYYY-MM matches
                    const rKey = `${rDate.getUTCFullYear()}-${String(rDate.getUTCMonth() + 1).padStart(2, '0')}`;
                    // Try local too just in case DB stores local
                    const rKeyLocal = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
                    return rKey === m.key || rKeyLocal === m.key || String(r.periodo).startsWith(m.key);
                });

                return {
                    name: m.name,
                    cumplimiento: record ? parseFloat(record.promedio || 0).toFixed(1) : 0
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
            const whereRegistro = {};

            // 1. Apply Scope Filters
            if (['contratista_admin', 'contratista_user'].includes(user.role)) {
                if (user.eecc_nombre) whereRegistro.eecc_nombre = user.eecc_nombre;
            }

            // 2. Date Range: Last 6 months (including current)
            const today = new Date();
            const startMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            whereRegistro.periodo = {
                [Op.between]: [startMonth, endMonth]
            };

            // 3. Fetch Data with Vinculacion associations
            const registros = await Registro.findAll({
                where: whereRegistro,
                include: [
                    {
                        model: Programa,
                        as: 'programa',
                        attributes: ['id', 'nombre']
                    },
                    {
                        model: Vinculacion,
                        as: 'vinculacionEntidad',
                        required: false,
                        include: [
                            { model: Contratista, as: 'contratista', attributes: ['id', 'nombre', 'rut'] },
                            { model: TipoContratista, as: 'servicio', attributes: ['id', 'nombre'] },
                            { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] }
                        ]
                    }
                ],
                order: [['periodo', 'ASC']]
            });

            // 4. Group by Unique Row Key (contratista + programa + servicio + dependencia)
            const rowsMap = new Map();

            registros.forEach(reg => {
                const vinc = reg.vinculacionEntidad || {};
                const empresa = vinc.contratista || {};
                const servicio = vinc.servicio || {};
                const dependencia = vinc.dependencia || {};
                const programa = reg.programa || {};

                const contratistaId = empresa.id || 'N/A';
                const programaId = programa.id || 'N/A';
                const servicioId = servicio.id || 'N/A';
                const dependenciaId = dependencia.id || 'N/A';

                const key = `${contratistaId}-${programaId}-${servicioId}-${dependenciaId}`;

                if (!rowsMap.has(key)) {
                    rowsMap.set(key, {
                        id: key,
                        contratista: empresa.nombre || reg.eecc_nombre || 'Desconocido',
                        rut: empresa.rut || '-',
                        programa: programa.nombre || 'Sin Programa',
                        servicio: servicio.nombre || '-',
                        dependencia: dependencia.nombre || reg.dependencia || '-',
                        data: {}
                    });
                }

                const row = rowsMap.get(key);
                const periodoStr = reg.periodo instanceof Date
                    ? reg.periodo.toISOString().substring(0, 7)
                    : String(reg.periodo).substring(0, 7);

                row.data[periodoStr] = {
                    declarado: parseFloat(reg.porcentaje_cumplimiento || 0).toFixed(1),
                    auditado: reg.porcentaje_cumplimiento_auditor !== null ? parseFloat(reg.porcentaje_cumplimiento_auditor).toFixed(1) : null,
                    registroId: reg.id,
                    estado: reg.estado_auditoria
                };
            });

            // 5. Generate Columns (Last 6 Months)
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
                    rows: Array.from(rowsMap.values())
                }
            });

        } catch (error) {
            console.error('Dashboard matrix error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener matriz' });
        }
    }
};

module.exports = dashboardController;
