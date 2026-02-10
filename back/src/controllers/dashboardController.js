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
    ContratistaAsignacion
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
                if (!user.eecc_nombre) {
                    return res.status(400).json({ success: false, message: 'Usuario contratista sin empresa asignada' });
                }
                whereRegistro.eecc_nombre = user.eecc_nombre;
            }

            // Filter for Contract Managers (Admin Contrato)
            const isContractManager = user.role === 'administrador_contrato';
            if (isContractManager) {
                // Find assignments managed by this user
                const assignments = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: user.id },
                    attributes: ['id']
                });
                const assignmentIds = assignments.map(a => a.id);

                // If no assignments, they see nothing (or empty)
                if (assignmentIds.length === 0) {
                    // Force empty result by impossible condition
                    whereRegistro.id = -1;
                } else {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: assignmentIds };
                }
            }

            // Total registros
            const totalRegistros = await Registro.count({ where: whereRegistro });

            // Registros pendientes auditoría
            const pendientesAuditoria = await Registro.count({
                where: { ...whereRegistro, estado_auditoria: 'pendiente' }
            });

            // Registros auditados
            const auditados = await Registro.count({
                where: {
                    ...whereRegistro,
                    estado_auditoria: { [Op.in]: ['auditada_sistema', 'auditada_terreno'] }
                }
            });

            // Promedio cumplimiento general
            const avgCumplimiento = await Registro.findOne({
                where: whereRegistro,
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('porcentaje_cumplimiento')), 'promedio']
                ],
                raw: true
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
            const usuariosActivos = isContractor ? 0 : await User.count({ where: { is_active: true } });

            res.json({
                success: true,
                data: {
                    totalRegistros,
                    pendientesAuditoria,
                    auditados,
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

            // Calculate range: First day of 5 months ago
            const today = new Date();
            const startMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);

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
                order: [['periodo', 'ASC']],
                raw: true
            });

            // Format for Frontend: { name: 'Ene', cumplimiento: 90 }
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            // Fill gaps? For now, just return what we have. Frontend can handle gaps or we fill them.
            // Let's map existing data.
            const data = registros.map(r => {
                const d = new Date(r.periodo);
                // Adjust for timezone issues if necessary, usually period is stored as date
                // Assuming UTC or local consistent
                return {
                    name: monthNames[d.getUTCMonth()], // + '-' + d.getgetFullYear().toString().substr(2)
                    cumplimiento: parseFloat(r.promedio || 0).toFixed(1)
                };
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Dashboard historico error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener historico' });
        }
    }
};

module.exports = dashboardController;
