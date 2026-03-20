const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Registro, RegistroActividad, Actividad, Hallazgo, User, Compromiso, Elemento, Vinculacion, Administracion, sequelize, Contratista } = require('../database/models');
const { Op } = require('sequelize');

module.exports = {
    async registroPdf(req, res) {
        try {
            const { id } = req.params;
            const registro = await Registro.findByPk(id, {
                include: [
                    { model: User, as: 'usuario', attributes: ['name', 'email', 'eecc_nombre'] },
                    {
                        model: RegistroActividad,
                        as: 'actividades',
                        include: [
                            { model: Actividad, as: 'actividad' },
                            { model: Hallazgo, as: 'hallazgos', include: ['compromisos'] }
                        ]
                    },
                    { model: User, as: 'auditor', attributes: ['name'] }
                ]
            });

            if (!registro) {
                return res.status(404).json({ message: 'Registro no encontrado' });
            }

            // Create PDF
            const doc = new PDFDocument({ margin: 50 });

            // Pipe to response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=registro-${registro.periodo}-${registro.id}.pdf`);
            doc.pipe(res);

            // -- HEADER --
            doc.fontSize(20).text('Informe de Cumplimiento OIEM', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).text(`Periodo: ${registro.periodo}`);
            doc.text(`Empresa: ${registro.eecc_nombre || registro.usuario.eecc_nombre}`);
            doc.text(`Responsable: ${registro.usuario.name}`);
            doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`);
            doc.moveDown();

            // -- SUMMARY --
            doc.fontSize(16).text('Resumen Ejecutivo', { underline: true });
            doc.fontSize(12).text(`Cumplimiento Total: ${registro.porcentaje_cumplimiento}%`);
            doc.text(`Auditoría: ${registro.porcentaje_cumplimiento_auditor ? registro.porcentaje_cumplimiento_auditor + '%' : 'Pendiente'}`);
            doc.text(`Estado: ${registro.estado_auditoria.toUpperCase()}`);
            if (registro.auditor) {
                doc.text(`Auditor: ${registro.auditor.name}`);
            }
            doc.moveDown();

            // -- FINDINGS --
            const hallazgos = [];
            registro.actividades.forEach(ra => {
                if (ra.hallazgos && ra.hallazgos.length > 0) {
                    hallazgos.push(...ra.hallazgos.map(h => ({ ...h.toJSON(), actividad: ra.actividad.codigo })));
                }
            });

            if (hallazgos.length > 0) {
                doc.fontSize(16).text('Hallazgos Identificados', { underline: true });
                doc.moveDown(0.5);

                hallazgos.forEach((h, i) => {
                    doc.fontSize(12).font('Helvetica-Bold').text(`${i + 1}. [${h.actividad}] ${h.tipo.toUpperCase()}`);
                    doc.font('Helvetica').text(`   Detalle: ${h.descripcion}`);
                    doc.text(`   Estado: ${h.estado}`);
                    if (h.compromisos && h.compromisos.length > 0) {
                        doc.text(`   Compromiso: ${h.compromisos[0].descripcion_compromiso} (${h.compromisos[0].fecha_cumplimiento})`, { color: 'blue' });
                        doc.fillColor('black'); // Reset color
                    }
                    doc.moveDown(0.5);
                });
                doc.moveDown();
            } else {
                doc.fontSize(12).text('No se registraron hallazgos en este periodo.');
                doc.moveDown();
            }

            // -- ACTIVITIES TABLE (Simplified) --
            doc.fontSize(16).text('Detalle de Actividades', { underline: true });
            doc.moveDown(0.5);

            registro.actividades.forEach(ra => {
                const status = ra.cumple ? 'CUMPLE' : 'NO CUMPLE';
                const auditStatus = ra.cumple_auditor === 1 ? 'OK' : (ra.cumple_auditor === 0 ? 'RECHAZADO' : '-');
                const color = ra.cumple ? 'green' : 'red';

                doc.fontSize(10).text(`${ra.actividad.codigo}: ${ra.actividad.descripcion.substring(0, 80)}...`);
                doc.fillColor(color).text(`   Reportado: ${status} | Auditoría: ${auditStatus}`);
                doc.fillColor('black');
                doc.moveDown(0.2);
            });

            // Footer
            doc.end();

        } catch (error) {
            console.error('PDF Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error generando PDF' });
            }
        }
    },

    async cumplimientoGeneral(req, res) {
        try {
            const { periodo } = req.query; // Format YYYY-MM
            const user = req.user;
            const whereRegistro = {};

            // 1. Get Vinculacion IDs based on role (Unified scope logic)
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

            if (periodo) {
                const startDate = new Date(periodo + '-01');
                const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
                whereRegistro.periodo = {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate
                };
            }

            // 1. Resumen de Registros
            const registros = await Registro.findAll({
                where: whereRegistro,
                attributes: ['id', 'periodo', 'eecc_nombre', 'porcentaje_cumplimiento', 'estado_auditoria', 'auditado'],
                order: [['periodo', 'DESC']],
                include: [{ model: User, as: 'usuario', attributes: ['name'] }]
            });

            // 2. Cumplimiento por Elemento
            // This is heavier. We need to aggregate RegistroActividad linked to these registros.
            // If no registros, elements are 0% or N/A?
            // Let's get all elements matches?
            // Complex query:
            // Select Elemento.nombre, AVG(case when respuesta='cumple' then 1 else 0 end)
            // From RegistroActividad
            // Join Actividad -> Elemento
            // Where registro_id IN (registros.ids)

            let elementosStats = [];
            const registroIds = registros.map(r => r.id);

            if (registroIds.length > 0) {
                // Raw query for aggregation
                /*
                SELECT e.id, e.nombre,
                       COUNT(ra.id) as total_actividades,
                       SUM(CASE WHEN ra.respuesta_auditor = 'cumple' OR (ra.respuesta_auditor IS NULL AND ra.respuesta_contratista = 'cumple') THEN 1 ELSE 0 END) as cumplidas
                FROM registro_actividades ra
                JOIN actividades a ON ra.actividad_id = a.id
                JOIN elementos e ON a.elemento_id = e.id
                WHERE ra.registro_id IN (...)
                GROUP BY e.id
                */
                // Using Sequelize syntax:
                // Using Sequelize syntax:
                elementosStats = await RegistroActividad.findAll({
                    attributes: [
                        [sequelize.col('actividad.elemento.id'), 'elemento_id'],
                        [sequelize.col('actividad.elemento.nombre'), 'elemento_nombre'],
                        // Total valid (not NA)
                        [sequelize.literal(`SUM(CASE WHEN cumple != 2 THEN 1 ELSE 0 END)`), 'total_declarado'],
                        [sequelize.literal(`SUM(CASE WHEN cumple_auditor != 2 AND cumple_auditor IS NOT NULL THEN 1 ELSE 0 END)`), 'total_auditado'],
                        // Numerator: count those that are 1 (declared)
                        [sequelize.literal(`SUM(CASE WHEN cumple = 1 THEN 1 ELSE 0 END)`), 'cumplidas_declarado'],
                        // Numerator: count those that are 1 (audited)
                        [sequelize.literal(`SUM(CASE WHEN cumple_auditor = 1 THEN 1 ELSE 0 END)`), 'cumplidas_auditado']
                    ],
                    include: [{
                        model: Actividad,
                        as: 'actividad',
                        attributes: [],
                        include: [{
                            model: Elemento,
                            as: 'elemento',
                            attributes: ['id', 'nombre']
                        }]
                    }],
                    where: { registro_id: registroIds },
                    group: ['actividad.elemento.id', 'actividad.elemento.nombre'],
                    raw: true
                });

                // Format
                elementosStats = elementosStats.map(e => ({
                    id: e.elemento_id,
                    name: e.elemento_nombre,
                    declarado: parseInt(e.total_declarado) > 0 ? Math.round((parseInt(e.cumplidas_declarado) / parseInt(e.total_declarado)) * 100) : 0,
                    auditado: parseInt(e.total_auditado) > 0 ? Math.round((parseInt(e.cumplidas_auditado) / parseInt(e.total_auditado)) * 100) : null
                }));
            }

            // Fill with all elements if needed (optional, for now show only what has data)
            // If we want to show ALL elements even with 0 data, we'd query Elemento.findAll and merge.
            // Let's stick to showing data for now.

            res.json({
                success: true,
                data: {
                    elementos: elementosStats,
                    registros: registros.map(r => ({
                        id: r.id,
                        periodo: r.periodo,
                        eecc: r.eecc_nombre || 'N/A',
                        cumplimiento: parseFloat(r.porcentaje_cumplimiento),
                        estado: parseFloat(r.porcentaje_cumplimiento) >= 85 ? 'Cumple meta' : 'Bajo meta',
                        statusClass: parseFloat(r.porcentaje_cumplimiento) >= 85 ? 'ok' : 'bad'
                    }))
                }
            });

        } catch (error) {
            console.error('Reporte Cumplimiento Error:', error);
            res.status(500).json({ message: 'Error al obtener reporte' });
        }
    },

    async cumplimientoGeneralPdf(req, res) {
        try {
            const { periodo } = req.query;
            // Re-using the logic from compliance general to fetch data
            // (In a real app, I'd extract this to a service)
            // For now, I'll do a quick version:
            
            // 1. Get stats
            const statsRes = await module.exports._getStats(req, periodo);
            const { elementos, registros } = statsRes;

            const doc = new PDFDocument({ margin: 50 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=consolidado-${periodo || 'general'}.pdf`);
            doc.pipe(res);

            doc.fontSize(20).text('Reporte Consolidado de Cumplimiento', { align: 'center' });
            doc.fontSize(12).text(`Periodo: ${periodo || 'Todos'}`, { align: 'center' });
            doc.moveDown();

            doc.fontSize(16).text('Cumplimiento por Elemento', { underline: true });
            doc.moveDown(0.5);
            elementos.forEach(e => {
                doc.fontSize(12).text(`${e.name}: ${e.declarado}%` + (e.auditado !== null ? ` (Auditado: ${e.auditado}%)` : ''));
            });
            doc.moveDown();

            doc.fontSize(16).text('Detalle de Empresas', { underline: true });
            doc.moveDown(0.5);
            registros.forEach(r => {
                doc.fontSize(10).text(`${r.eecc}: ${r.cumplimiento}% - ${r.estado}`);
            });

            doc.end();
        } catch (error) {
            console.error('Consolidated PDF Error:', error);
            res.status(500).json({ message: 'Error generando PDF consolidado' });
        }
    },

    async cumplimientoGeneralExcel(req, res) {
        try {
            const { periodo } = req.query;
            const statsRes = await module.exports._getStats(req, periodo);
            const { registros } = statsRes;

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Cumplimiento');

            sheet.columns = [
                { header: 'Periodo', key: 'periodo', width: 15 },
                { header: 'Empresa (EECC)', key: 'eecc', width: 30 },
                { header: 'Cumplimiento %', key: 'cumplimiento', width: 15 },
                { header: 'Estado', key: 'estado', width: 20 }
            ];

            registros.forEach(r => {
                sheet.addRow({
                    periodo: r.periodo,
                    eecc: r.eecc,
                    cumplimiento: r.cumplimiento,
                    estado: r.estado
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=cumplimiento-${periodo || 'general'}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Consolidated Excel Error:', error);
            res.status(500).json({ message: 'Error generando Excel consolidado' });
        }
    },

    // Internal helper to avoid code duplication
    async _getStats(req, periodo) {
        // This logic is mostly copied from cumplimientoGeneral for this demo
        const user = req.user;
        const whereRegistro = {};
        
        // Unified scope logic (Simplified for helper)
        if (user.role === 'administrador_contrato') {
            const adminRecords = await Administracion.findAll({ where: { administrador_contrato_id: user.id, activo: 1 } });
            whereRegistro.contratista_asignacion_id = { [Op.in]: adminRecords.map(a => a.vinculacion_id) };
        }
        
        if (periodo) {
            const startDate = new Date(periodo + '-01');
            const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
            whereRegistro.periodo = { [Op.gte]: startDate, [Op.lt]: endDate };
        }

        const registros = await Registro.findAll({
            where: whereRegistro,
            attributes: ['id', 'periodo', 'eecc_nombre', 'porcentaje_cumplimiento', 'estado_auditoria'],
            order: [['periodo', 'DESC']]
        });

        const registroIds = registros.map(r => r.id);
        let elementosStats = [];
        if (registroIds.length > 0) {
            elementosStats = await RegistroActividad.findAll({
                attributes: [
                    [sequelize.col('actividad.elemento.id'), 'elemento_id'],
                    [sequelize.col('actividad.elemento.nombre'), 'elemento_nombre'],
                    [sequelize.literal(`SUM(CASE WHEN cumple != 2 THEN 1 ELSE 0 END)`), 'total_declarado'],
                    [sequelize.literal(`SUM(CASE WHEN cumple = 1 THEN 1 ELSE 0 END)`), 'cumplidas_declarado'],
                    [sequelize.literal(`SUM(CASE WHEN cumple_auditor != 2 AND cumple_auditor IS NOT NULL THEN 1 ELSE 0 END)`), 'total_auditado'],
                    [sequelize.literal(`SUM(CASE WHEN cumple_auditor = 1 THEN 1 ELSE 0 END)`), 'cumplidas_auditado']
                ],
                include: [{ model: Actividad, as: 'actividad', include: [{ model: Elemento, as: 'elemento' }] }],
                where: { registro_id: registroIds },
                group: ['actividad.elemento.id', 'actividad.elemento.nombre'],
                raw: true
            });

            elementosStats = elementosStats.map(e => ({
                id: e['elemento_id'],
                name: e['elemento_nombre'],
                declarado: parseInt(e.total_declarado) > 0 ? Math.round((parseInt(e.cumplidas_declarado) / parseInt(e.total_declarado)) * 100) : 0,
                auditado: parseInt(e.total_auditado) > 0 ? Math.round((parseInt(e.cumplidas_auditado) / parseInt(e.total_auditado)) * 100) : null
            }));
        }

        return {
            elementos: elementosStats,
            registros: registros.map(r => ({
                id: r.id,
                periodo: r.periodo,
                eecc: r.eecc_nombre || 'N/A',
                cumplimiento: parseFloat(r.porcentaje_cumplimiento),
                estado: parseFloat(r.porcentaje_cumplimiento) >= 85 ? 'Cumple meta' : 'Bajo meta'
            }))
        };
    }
};
