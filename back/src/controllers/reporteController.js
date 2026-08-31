const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Registro, RegistroActividad, Actividad, Hallazgo, User, Compromiso, Elemento, Vinculacion, Administracion, sequelize, Contratista, TipoContratista, Dependencia, Programa } = require('../database/models');
const { Op } = require('sequelize');
const { getProgramaScope, intersectWithProgramaScope } = require('../utils/programaScopeHelper');

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
                            { model: Hallazgo, as: 'hallazgos', include: ['compromisos'] },
                            { model: require('../database/models').Evidencia, as: 'evidencias' }
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

            doc.fontSize(10).text(`Periodo: ${registro.periodo}`);
            doc.text(`Empresa: ${registro.eecc_nombre || registro.usuario.eecc_nombre}`);
            doc.text(`Responsable: ${registro.usuario.name}`);
            doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`);
            doc.moveDown();

            // -- DOTACIÓN --
            doc.fontSize(14).text('Información de Dotación', { underline: true });
            doc.fontSize(10);
            doc.text(`Dotación Total: ${registro.dotacion_total || 0}`);
            doc.text(`Personas Nuevas: ${registro.personas_nuevas || 0}`);
            doc.text(`Supervisores: ${registro.supervisores || 0}`);
            doc.text(`Prevencionistas: ${registro.prevencionistas || 0}`);
            doc.moveDown();

            // -- SUMMARY --
            doc.fontSize(14).text('Resumen de Auditoría', { underline: true });
            doc.fontSize(10).text(`Cumplimiento Declarado: ${registro.porcentaje_cumplimiento}%`);
            doc.text(`Cumplimiento Auditor: ${registro.porcentaje_cumplimiento_auditor !== null ? registro.porcentaje_cumplimiento_auditor + '%' : 'Pendiente'}`);
            doc.text(`Estado: ${registro.estado_auditoria.toUpperCase()}`);
            if (registro.auditor) {
                doc.text(`Auditor: ${registro.auditor.name}`);
            }
            if (registro.observaciones_auditoria || registro.comentario_general) {
                doc.moveDown(0.5);
                doc.text(`Comentario General: ${registro.observaciones_auditoria || registro.comentario_general}`);
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
                doc.fontSize(14).text('Hallazgos Identificados', { underline: true });
                doc.moveDown(0.5);

                hallazgos.forEach((h, i) => {
                    doc.fontSize(10).font('Helvetica-Bold').text(`${i + 1}. [${h.actividad}] ${h.tipo.toUpperCase()}`);
                    doc.font('Helvetica').text(`   Detalle: ${h.descripcion}`);
                    doc.text(`   Estado: ${h.estado}`);
                    if (h.compromisos && h.compromisos.length > 0) {
                        doc.fillColor('blue').text(`   Compromiso: ${h.compromisos[0].descripcion_compromiso || h.compromisos[0].descripcion} (${new Date(h.compromisos[0].fecha_cumplimiento || h.compromisos[0].fecha_compromiso).toLocaleDateString()})`);
                        doc.fillColor('black');
                    }
                    doc.moveDown(0.5);
                });
                doc.moveDown();
            }

            // -- ACTIVITIES TABLE --
            doc.fontSize(14).text('Detalle de Actividades', { underline: true });
            doc.moveDown(0.5);

            registro.actividades.sort((a, b) => (a.actividad?.codigo || '').localeCompare(b.actividad?.codigo || '')).forEach(ra => {
                const status = ra.cumple ? 'CUMPLE' : 'NO CUMPLE';
                const auditStatus = ra.cumple_auditor === 1 || ra.cumple_auditor === true ? 'CUMPLE' : (ra.cumple_auditor === 0 || ra.cumple_auditor === false ? 'NO CUMPLE' : '-');
                const color = ra.cumple ? 'green' : 'red';
                const auditColor = ra.cumple_auditor === true || ra.cumple_auditor === 1 ? 'green' : (ra.cumple_auditor === false || ra.cumple_auditor === 0 ? 'red' : 'black');

                doc.fontSize(9).font('Helvetica-Bold').text(`${ra.actividad?.codigo || '-'}: ${ra.actividad?.descripcion || ra.descripcion_actividad}`);
                doc.font('Helvetica').fontSize(8);
                doc.fillColor(color).text(`   Reportado: ${status}`, { continued: true });
                doc.fillColor('black').text(` | Auditoría: `, { continued: true });
                doc.fillColor(auditColor).text(`${auditStatus}`);
                doc.fillColor('black');

                if (ra.responsable) doc.text(`   Responsable: ${ra.responsable}`);
                if (ra.descripcion_contratista) doc.text(`   Obs. Contratista: ${ra.descripcion_contratista}`);
                if (ra.observacion_auditor) doc.text(`   Obs. Auditor: ${ra.observacion_auditor}`);
                
                if (ra.evidencias && ra.evidencias.length > 0) {
                    const evNames = ra.evidencias.map(e => e.nombre_archivo).join(', ');
                    doc.fillColor('blue').text(`   Evidencias: ${evNames}`);
                    doc.fillColor('black');
                }

                doc.moveDown(0.4);
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
            const { periodo, periodo_desde, periodo_hasta } = req.query; 
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
                const cIds = [];
                if (Array.isArray(user.contratista_ids) && user.contratista_ids.length > 0) {
                    cIds.push(...user.contratista_ids.map(Number));
                }
                if (user.contratista_id && !cIds.includes(Number(user.contratista_id))) {
                    cIds.push(Number(user.contratista_id));
                }
                if (cIds.length > 0) {
                    const vincs = await Vinculacion.findAll({
                        where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                        attributes: ['id']
                    });
                    const vincIds = vincs.map(v => v.id);
                    if (vincIds.length === 0) whereRegistro.id = -1;
                    else whereRegistro.contratista_asignacion_id = { [Op.in]: vincIds };
                } else {
                    whereRegistro.id = -1;
                }
            } else if (user.role === 'contratista_user') {
                const myVincIds = (user.vinculacion_ids && user.vinculacion_ids.length > 0)
                    ? user.vinculacion_ids
                    : (user.vinculacion_id ? [user.vinculacion_id] : []);
                if (myVincIds.length > 0) {
                    whereRegistro.contratista_asignacion_id = { [Op.in]: myVincIds.map(Number) };
                } else {
                    whereRegistro.id = -1;
                }
            }

            if (periodo_desde || periodo_hasta || periodo) {
                const startDate = new Date((periodo_desde || periodo) + '-01');
                const endDate = periodo_hasta 
                    ? new Date(new Date(periodo_hasta + '-01').setMonth(new Date(periodo_hasta + '-01').getMonth() + 1))
                    : new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
                    
                whereRegistro.periodo = {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate
                };
            }

            // Filtro global (todos los roles, sin excepción, incluido admin/oval): solo
            // registros cuya vinculación tiene Programa asignado en su servicio.
            const soloHuerfanosCG = req.query.solo_huerfanos === 'true';
            const programaScopeCG = await getProgramaScope();
            whereRegistro.contratista_asignacion_id = intersectWithProgramaScope(
                whereRegistro.contratista_asignacion_id,
                programaScopeCG.vinculacionIds,
                soloHuerfanosCG
            );

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
            const { periodo, periodo_desde, periodo_hasta } = req.query;
            const statsRes = await module.exports._getStats(req, periodo);
            const { elementos, registros } = statsRes;

            const doc = new PDFDocument({ 
                margin: 50,
                size: 'A4',
                bufferPages: true
            });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=consolidado-${periodo_desde || 'general'}.pdf`);
            doc.pipe(res);

            const path = require('path');
            const logoAbastible = path.join(__dirname, '../assets/logos/abastible.png');
            const logoOval = path.join(__dirname, '../assets/logos/oval.png');

            // --- HEADER ---
            doc.rect(0, 0, 612, 80).fill('#003399'); // Abastible Blue
            
            try {
                const fs = require('fs');
                if (fs.existsSync(logoAbastible)) doc.image(logoAbastible, 40, 20, { height: 40 });
                if (fs.existsSync(logoOval)) doc.image(logoOval, 480, 20, { height: 40 });
            } catch (err) {
                console.warn('Logos not found for PDF');
            }

            doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
               .text('REPORTE CONSOLIDADO DE CUMPLIMIENTO', 0, 30, { align: 'center' });
            
            doc.moveDown(4);

            // --- INFO BOX ---
            doc.fillColor('#1e293b');
            doc.fontSize(10).font('Helvetica')
               .text(`Periodo: ${periodo_desde || 'Todos'}`, { align: 'left' });
            doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')}`, { align: 'right' });
            doc.moveDown();

            // --- SUMMARY CARDS ---
            const startY = doc.y;
            const cardWidth = 240;
            
            // Card 1: Total Registros
            doc.rect(50, startY, cardWidth, 60).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fillColor('#64748b').fontSize(8).text('TOTAL REGISTROS', 60, startY + 15);
            doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(registros.length.toString(), 60, startY + 30);

            // Card 2: Promedio Cumplimiento
            const avgCumplimiento = registros.length > 0 
                ? Math.round(registros.reduce((acc, r) => acc + r.cumplimiento, 0) / registros.length)
                : 0;
            doc.rect(320, startY, cardWidth, 60).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fillColor('#64748b').fontSize(8).text('PROMEDIO CUMPLIMIENTO', 330, startY + 15);
            doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(`${avgCumplimiento}%`, 330, startY + 30);

            doc.moveDown(6);

            // --- TABLE 1: CUMPLIMIENTO POR ELEMENTO ---
            doc.fillColor('#003399').fontSize(12).font('Helvetica-Bold').text('CUMPLIMIENTO POR ELEMENTO', { underline: true });
            doc.moveDown();

            let tableTop = doc.y;
            doc.fontSize(10).fillColor('#475569');
            doc.text('Elemento', 50, tableTop);
            doc.text('Cumplimiento', 400, tableTop);
            doc.text('Auditado', 500, tableTop);
            
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#cbd5e1');
            doc.moveDown();

            elementos.forEach((e, index) => {
                const rowY = doc.y;
                if (index % 2 === 0) doc.rect(50, rowY - 5, 500, 25).fill('#f1f5f9');
                doc.fillColor('#1e293b').font('Helvetica');
                doc.text(e.name, 50, rowY, { width: 340 });
                doc.text(`${e.declarado}%`, 400, rowY);
                doc.text(e.auditado !== null ? `${e.auditado}%` : '-', 500, rowY);
                doc.moveDown(1.5);
            });

            doc.moveDown(2);

            // --- TABLE 2: DETALLE DE EMPRESAS ---
            doc.fillColor('#003399').fontSize(12).font('Helvetica-Bold').text('DETALLE DE EMPRESAS', { underline: true });
            doc.moveDown();

            tableTop = doc.y;
            doc.fontSize(10).fillColor('#475569');
            doc.text('Empresa (EECC)', 50, tableTop);
            doc.text('Cumplimiento', 400, tableTop);
            doc.text('Estado', 500, tableTop);
            
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#cbd5e1');
            doc.moveDown();

            registros.forEach((r, index) => {
                const rowY = doc.y;
                if (index % 2 === 0) doc.rect(50, rowY - 5, 500, 25).fill('#f1f5f9');
                doc.fillColor('#1e293b').font('Helvetica');
                doc.text(r.eecc, 50, rowY, { width: 340 });
                doc.text(`${r.cumplimiento}%`, 400, rowY);
                doc.text(r.estado, 500, rowY);
                doc.moveDown(1.5);
            });

            // Footer
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor('#94a3b8')
                   .text(`Reporte generado por Plataforma OVAL Control para Abastible S.A. | Página ${i + 1} de ${pages.count}`, 
                   0, 780, { align: 'center' });
            }

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

    async matrixPdf(req, res) {
        try {
            const matrixData = await module.exports._getMatrixData(req);
            const { columns, rows } = matrixData;

            const doc = new PDFDocument({ margin: 30, layout: 'landscape' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=matriz-cumplimiento-${new Date().toISOString().slice(0, 10)}.pdf`);
            doc.pipe(res);

            // Header
            doc.fontSize(18).text('Matriz de Cumplimiento OIEM', { align: 'center' });
            doc.fontSize(10).text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.moveDown();

            // Table Header Settings
            const startX = 30;
            let currentY = doc.y;
            const colWidths = [150, 150, 80]; // Empresa, Programa, Dependencia
            const totalWidth = 732; // landscape A4 is 792 - margins
            const monthColWidth = (totalWidth - 380) / columns.length;

            // Draw header backgrounds
            doc.rect(startX, currentY, totalWidth, 25).fill('#f8fafc');
            doc.fillColor('#475569').fontSize(8);

            // Header Text
            let currentX = startX;
            doc.text('EMPRESA / CONTRATISTA', currentX + 5, currentY + 8, { width: 140 });
            currentX += 150;
            doc.text('PROGRAMA / SERVICIO', currentX + 5, currentY + 8, { width: 140 });
            currentX += 150;
            doc.text('DEPENDENCIA', currentX + 5, currentY + 8, { width: 70 });
            currentX += 80;

            columns.forEach(col => {
                doc.text(col.label, currentX + 5, currentY + 8, { width: monthColWidth, align: 'center' });
                currentX += monthColWidth;
            });

            doc.moveDown();
            currentY += 25;

            // Draw Rows
            rows.forEach(row => {
                if (currentY > 500) { // New page if near bottom
                    doc.addPage({ layout: 'landscape' });
                    currentY = 30;
                }

                doc.fillColor('#1e293b').fontSize(7);
                let x = startX;

                // Empresa
                doc.font('Helvetica-Bold').text(row.contratista, x + 5, currentY + 5, { width: 140 });
                doc.font('Helvetica').fontSize(6).text(row.rut, x + 5, currentY + 15);
                x += 150;

                // Programa
                doc.fontSize(7).font('Helvetica-Bold').text(row.programa, x + 5, currentY + 5, { width: 140 });
                doc.font('Helvetica').fontSize(6).text(row.servicio, x + 5, currentY + 15);
                x += 150;

                // Dependencia
                doc.fontSize(7).text(row.dependencia, x + 5, currentY + 10, { width: 70 });
                x += 80;

                // Data Cells
                columns.forEach(col => {
                    const cell = row.data[col.key];
                    if (cell) {
                        const val = `${cell.declarado}%` + (cell.auditado !== null ? `|${cell.auditado}%` : '');
                        doc.text(val, x, currentY + 5, { width: monthColWidth, align: 'center' });
                        doc.fontSize(5).text(cell.estado ? cell.estado.replace('_', ' ').toUpperCase() : '', x, currentY + 15, { width: monthColWidth, align: 'center' });
                        doc.fontSize(7);
                    } else {
                        doc.text('-', x, currentY + 10, { width: monthColWidth, align: 'center' });
                    }
                    x += monthColWidth;
                });

                // Line separator
                currentY += 30;
                doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke('#e2e8f0');
            });

            doc.end();
        } catch (error) {
            console.error('Matrix PDF Error:', error);
            res.status(500).json({ message: 'Error generando PDF de matriz' });
        }
    },

    async matrixExcel(req, res) {
        try {
            const matrixData = await module.exports._getMatrixData(req);
            const { columns, rows } = matrixData;

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Matriz de Cumplimiento');

            // Header Style
            const headerStyle = {
                font: { bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003594' } },
                alignment: { vertical: 'middle', horizontal: 'center' }
            };

            // Define Columns
            const sheetCols = [
                { header: 'Empresa', key: 'contratista', width: 30 },
                { header: 'RUT', key: 'rut', width: 15 },
                { header: 'Programa', key: 'programa', width: 30 },
                { header: 'Servicio', key: 'servicio', width: 30 },
                { header: 'Dependencia', key: 'dependencia', width: 20 }
            ];

            columns.forEach(col => {
                sheetCols.push({ header: col.label, key: col.key, width: 20 });
            });

            sheet.columns = sheetCols;

            // Apply Header Style
            sheet.getRow(1).eachCell(cell => {
                cell.style = headerStyle;
            });

            // Add Rows
            rows.forEach(row => {
                const rowData = {
                    contratista: row.contratista,
                    rut: row.rut,
                    programa: row.programa,
                    servicio: row.servicio,
                    dependencia: row.dependencia
                };

                columns.forEach(col => {
                    const cell = row.data[col.key];
                    if (cell) {
                        rowData[col.key] = `${cell.declarado}%` + (cell.auditado !== null ? ` / ${cell.auditado}%` : '');
                    } else {
                        rowData[col.key] = '-';
                    }
                });

                const addedRow = sheet.addRow(rowData);
                addedRow.alignment = { vertical: 'middle', horizontal: 'left' };
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=matriz-${new Date().toISOString().slice(0, 10)}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Matrix Excel Error:', error);
            res.status(500).json({ message: 'Error generando Excel de matriz' });
        }
    },

    async _getMatrixData(req) {
        const user = req.user;
        const { contratista_id, servicio_id, dependencia_id, programa_id, periodo, periodo_desde, periodo_hasta } = req.query;

        const whereVinculacion = { activo: 1 };
        let allowedContratistaIds = null; // null = sin restricción (admin/oval)

        // 1. Role Scope
        if (user.role === 'administrador_contrato') {
            const adminRecords = await Administracion.findAll({
                where: { administrador_contrato_id: user.id, activo: 1 },
                attributes: ['vinculacion_id']
            });
            const vincIds = adminRecords.map(a => a.vinculacion_id);
            whereVinculacion.id = vincIds.length > 0 ? { [Op.in]: vincIds } : -1;
        } else if (user.role === 'contratista_admin') {
            allowedContratistaIds = user.contratista_ids || (user.contratista_id ? [user.contratista_id] : []);
            whereVinculacion.contratista_id = { [Op.in]: allowedContratistaIds };
        } else if (user.role === 'contratista_user') {
            // Ancla por vinculacion_ids (los contratos asignados). A diferencia de anclar
            // por contratista_id/servicio_id/dependencia_id, estos NUNCA se tocan en el paso
            // 2 (los filtros de query solo escriben esas tres claves), así que ninguna query
            // param puede pisar el scope.
            const myVincIds = (user.vinculacion_ids && user.vinculacion_ids.length > 0)
                ? user.vinculacion_ids
                : (user.vinculacion_id ? [user.vinculacion_id] : []);
            whereVinculacion.id = myVincIds.length > 0 ? { [Op.in]: myVincIds.map(Number) } : -1;
        }

        // 2. Filters (Case-insensitive check for "todos" o "todas"). Para contratista_admin,
        // solo se aceptan si caen dentro de su propio portafolio (allowedContratistaIds);
        // si no, se ignoran (fail-safe, nunca se amplía el scope por un query param).
        if (contratista_id && String(contratista_id).toLowerCase() !== 'todos') {
            if (allowedContratistaIds === null || allowedContratistaIds.map(Number).includes(Number(contratista_id))) {
                whereVinculacion.contratista_id = contratista_id;
            }
        }
        if (user.role !== 'contratista_user') {
            if (servicio_id && String(servicio_id).toLowerCase() !== 'todos') whereVinculacion.servicio_id = servicio_id;
            if (dependencia_id && String(dependencia_id).toLowerCase() !== 'todas') whereVinculacion.dependencia_id = dependencia_id;
        }

        // 3. Date Range
        let startMonth, endMonth;
        if (periodo_desde && periodo_hasta) {
            startMonth = new Date(periodo_desde + '-01');
            endMonth = new Date(new Date(periodo_hasta + '-01').setMonth(new Date(periodo_hasta + '-01').getMonth() + 1, 0));
        } else {
            const today = periodo ? new Date(periodo + '-01') : new Date();
            startMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        // Filtro global (todos los roles, sin excepción, incluido admin/oval): solo
        // vinculaciones con Programa asignado en su servicio.
        const soloHuerfanosMatrixData = req.query.solo_huerfanos === 'true';
        const programaScopeMatrixData = await getProgramaScope();
        whereVinculacion.id = intersectWithProgramaScope(whereVinculacion.id, programaScopeMatrixData.vinculacionIds, soloHuerfanosMatrixData);

        // 4. Fetch
        const vinculaciones = await Vinculacion.findAll({
            where: whereVinculacion,
            include: [
                { model: Contratista, as: 'contratista', attributes: ['nombre', 'rut'] },
                {
                    model: TipoContratista, as: 'servicio',
                    include: [{
                        model: Programa, as: 'programa',
                        where: (programa_id && programa_id !== 'todos') ? { id: programa_id } : undefined
                    }]
                },
                { model: Dependencia, as: 'dependencia', attributes: ['nombre'] },
                {
                    model: Registro, as: 'registros',
                    required: false,
                    where: { periodo: { [Op.between]: [startMonth, endMonth] } }
                }
            ],
            order: [['id', 'ASC']]
        });

        // 5. Map Rows
        const rows = vinculaciones.map(vinc => {
            const row = {
                contratista: vinc.contratista?.nombre || 'N/A',
                rut: vinc.contratista?.rut || '-',
                programa: vinc.servicio?.programa?.nombre || 'Sin Programa',
                servicio: vinc.servicio?.nombre || '-',
                dependencia: vinc.dependencia?.nombre || '-',
                data: {}
            };
            vinc.registros.forEach(reg => {
                const key = String(reg.periodo).substring(0, 7);
                row.data[key] = {
                    declarado: parseFloat(reg.porcentaje_cumplimiento || 0).toFixed(1),
                    auditado: reg.porcentaje_cumplimiento_auditor !== null ? parseFloat(reg.porcentaje_cumplimiento_auditor).toFixed(1) : null,
                    estado: reg.estado_auditoria
                };
            });
            return row;
        });

        // 6. Columns
        const columns = [];
        let curr = new Date(startMonth);
        while (curr <= endMonth) {
            columns.push({
                key: curr.toISOString().slice(0, 7),
                label: curr.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase()
            });
            curr.setMonth(curr.getMonth() + 1);
        }

        return { columns, rows };
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
        } else if (user.role === 'contratista_admin') {
            const cIds = user.contratista_ids || (user.contratista_id ? [user.contratista_id] : []);
            if (cIds.length > 0) {
                const vincs = await Vinculacion.findAll({
                    where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
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
        
        if (req.query.periodo_desde || req.query.periodo_hasta || periodo) {
            const startDate = new Date((req.query.periodo_desde || periodo) + '-01');
            const endMonthDate = req.query.periodo_hasta ? new Date(req.query.periodo_hasta + '-01') : startDate;
            const endDate = new Date(new Date(endMonthDate).setMonth(endMonthDate.getMonth() + 1));
            whereRegistro.periodo = { [Op.gte]: startDate, [Op.lt]: endDate };
        }

        // Filtro global (todos los roles, sin excepción, incluido admin/oval): solo
        // registros cuya vinculación tiene Programa asignado en su servicio.
        const soloHuerfanosStats = req.query.solo_huerfanos === 'true';
        const programaScopeStats = await getProgramaScope();
        whereRegistro.contratista_asignacion_id = intersectWithProgramaScope(
            whereRegistro.contratista_asignacion_id,
            programaScopeStats.vinculacionIds,
            soloHuerfanosStats
        );

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
    },

    async billingReport(req, res) {
        try {
            const reportData = await module.exports._getBillingData();
            res.json({
                success: true,
                data: reportData
            });
        } catch (error) {
            console.error('Billing Report Error:', error);
            res.status(500).json({ success: false, message: 'Error al generar reporte de facturación' });
        }
    },

    async _getBillingData() {
        const { Configuracion, Registro } = require('../database/models');
        
        // 1. Get billable amount from config
        const configMonto = await Configuracion.findOne({ where: { clave: 'monto_facturable_contrato' } });
        const montoUnitario = parseFloat(configMonto?.valor || 1000);

        // 2. Fetch Contractors with active vinculaciones that have an active program AND at least 1 created Registro
        // REGLA DE EXCLUSIÓN DEMO: Excluir explícitamente cualquier empresa o contrato con denominación DEMO
        const contratistas = await Contratista.findAll({
            where: {
                activo: 1,
                nombre: { [Op.notLike]: '%DEMO%' }
            },
            include: [
                {
                    model: Vinculacion,
                    as: 'vinculaciones',
                    where: {
                        activo: 1,
                        numero_contrato: { [Op.notLike]: '%DEMO%' }
                    },
                    required: true,
                    include: [
                        {
                            model: TipoContratista,
                            as: 'servicio',
                            required: true,
                            include: [
                                {
                                    model: Programa,
                                    as: 'programa',
                                    where: { activo: 1 },
                                    required: true
                                }
                            ]
                        },
                        { model: Dependencia, as: 'dependencia' },
                        {
                            model: Registro,
                            as: 'registros',
                            required: true // Contabilizar exclusivamente vinculaciones con al menos 1 registro de cumplimiento creado
                        }
                    ]
                }
            ]
        });

        const mappedContratistas = contratistas
            .map(c => {
                const activeContracts = c.vinculaciones || [];
                // Billable contracts: must have active programa AND at least 1 created registro AND not be DEMO
                const billableContracts = activeContracts.filter(v => 
                    v.servicio?.programa && 
                    v.registros && 
                    v.registros.length > 0 &&
                    !v.numero_contrato.toUpperCase().includes('DEMO')
                );
                
                return {
                    id: c.id,
                    nombre: c.nombre,
                    rut: c.rut,
                    totalContratos: activeContracts.length,
                    contratosFacturables: billableContracts.length,
                    montoTotal: billableContracts.length * montoUnitario,
                    detalleContratos: billableContracts.map(v => ({
                        id: v.id,
                        numero_contrato: v.numero_contrato,
                        servicio: v.servicio.nombre,
                        programa: v.servicio.programa.nombre,
                        dependencia: v.dependencia?.nombre || 'N/A',
                        totalRegistros: v.registros.length
                    }))
                };
            })
            .filter(c => c.contratosFacturables > 0 && !c.nombre.toUpperCase().includes('DEMO')); // Exclusivamente empresas reales con contratos facturables

        return {
            montoUnitario,
            contratistas: mappedContratistas,
            resumen: {
                totalContratistas: mappedContratistas.length,
                totalContratosFacturables: mappedContratistas.reduce((acc, c) => acc + c.contratosFacturables, 0),
                montoGranTotal: mappedContratistas.reduce((acc, c) => acc + c.montoTotal, 0)
            }
        };
    },

    async updateBillingConfig(req, res) {
        try {
            const { monto } = req.body;
            const { Configuracion } = require('../database/models');
            
            let config = await Configuracion.findOne({ where: { clave: 'monto_facturable_contrato' } });
            
            if (config) {
                await config.update({ valor: String(monto) });
            } else {
                await Configuracion.create({
                    clave: 'monto_facturable_contrato',
                    valor: String(monto),
                    tipo: 'number',
                    descripcion: 'Monto facturable por contrato con programa activo'
                });
            }

            res.json({ success: true, message: 'Configuración actualizada correctamente' });
        } catch (error) {
            console.error('Update Billing Config Error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
        }
    },

    async _generateBillingPdf(reportData, stream) {
        const path = require('path');
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            bufferPages: true,
            info: {
                Title: 'Reporte de Facturación OVAL',
                Author: 'OVAL Control'
            }
        });
        
        doc.pipe(stream);

        // Assets paths
        const logoAbastible = path.join(__dirname, '../assets/logos/abastible.png');
        const logoOval = path.join(__dirname, '../assets/logos/oval.png');

        // --- HEADER ---
        // Draw a top blue bar
        doc.rect(0, 0, 612, 80).fill('#003399'); // Abastible Blue
        
        // Add logos in header
        try {
            const fs = require('fs');
            if (fs.existsSync(logoAbastible)) doc.image(logoAbastible, 40, 20, { height: 40 });
            if (fs.existsSync(logoOval)) doc.image(logoOval, 480, 20, { height: 40 });
        } catch (err) {
            console.warn('Logos not found for PDF, skipping images');
        }

        doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
           .text('INFORME DE FACTURACIÓN MENSUAL', 0, 30, { align: 'center' });
        
        doc.moveDown(4);

        // --- INFO BOX ---
        doc.fillColor('#1e293b'); // Dark Slate
        doc.fontSize(10).font('Helvetica')
           .text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
        doc.moveDown();

        // --- SUMMARY CARDS ---
        const startY = doc.y;
        const cardWidth = 160;
        
        // Card 1: Total Contratistas
        doc.rect(50, startY, cardWidth, 60).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).text('CONTRATISTAS', 60, startY + 15);
        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(reportData.resumen.totalContratistas.toString(), 60, startY + 30);

        // Card 2: Contratos
        doc.rect(220, startY, cardWidth, 60).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).text('CONTRATOS FACTURABLES', 230, startY + 15);
        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(reportData.resumen.totalContratosFacturables.toString(), 230, startY + 30);

        // Card 3: Total $
        doc.rect(390, startY, cardWidth, 60).fillAndStroke('#fff7ed', '#fdba74'); // Orange tint
        doc.fillColor('#ea580c').fontSize(8).text('TOTAL FACTURABLE', 400, startY + 15);
        doc.fillColor('#9a3412').fontSize(14).font('Helvetica-Bold').text(`$${new Intl.NumberFormat('es-CL').format(reportData.resumen.montoGranTotal)}`, 400, startY + 30);

        doc.moveDown(6);

        // --- TABLE HEADER ---
        doc.fillColor('#003399').fontSize(12).font('Helvetica-Bold').text('DETALLE DE FACTURACIÓN POR EMPRESA', { underline: true });
        doc.moveDown();

        // Table Columns Helper
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 300;
        const col3 = 400;
        const col4 = 500;

        doc.fontSize(10).fillColor('#475569');
        doc.text('Empresa Contratista', col1, tableTop);
        doc.text('RUT', col2, tableTop);
        doc.text('Cant.', col3, tableTop);
        doc.text('Monto Total', col4, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#cbd5e1');
        doc.moveDown();

        // --- TABLE ROWS ---
        reportData.contratistas.forEach((c, index) => {
            if (c.contratosFacturables > 0) {
                const rowY = doc.y;
                
                // Zebra striping
                if (index % 2 === 0) {
                    doc.rect(50, rowY - 5, 500, 25).fill('#f1f5f9');
                }

                doc.fillColor('#1e293b').font('Helvetica');
                doc.text(c.nombre, col1, rowY, { width: 240 });
                doc.text(c.rut, col2, rowY);
                doc.text(c.contratosFacturables.toString(), col3, rowY);
                doc.font('Helvetica-Bold').text(`$${new Intl.NumberFormat('es-CL').format(c.montoTotal)}`, col4, rowY);
                
                doc.moveDown(1.5);

                // Sub-Table for Contract Details
                if (c.detalleContratos.length > 0) {
                    const subTableX = col1 + 20;
                    const subTableWidth = 480;
                    const subCol1 = subTableX + 5;
                    const subCol2 = subTableX + 100;
                    const subCol3 = subTableX + 300;

                    // Header Sub-table
                    doc.rect(subTableX, doc.y, subTableWidth, 15).fill('#f1f5f9');
                    doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold');
                    const headerY = doc.y + 4;
                    doc.text('N° CONTRATO', subCol1, headerY);
                    doc.text('SERVICIO / PROGRAMA', subCol2, headerY);
                    doc.text('DEPENDENCIA', subCol3, headerY);
                    doc.moveDown(0.8);

                    // Rows Sub-table
                    c.detalleContratos.forEach(v => {
                        doc.fillColor('#64748b').fontSize(7).font('Helvetica');
                        const subRowY = doc.y;
                        doc.text(v.numero_contrato, subCol1, subRowY);
                        doc.text(`${v.servicio} (${v.programa})`, subCol2, subRowY, { width: 190 });
                        doc.text(v.dependencia, subCol3, subRowY, { width: 150 });
                        doc.moveDown(1.2);
                        
                        // Thin separator line
                        doc.moveTo(subTableX, doc.y - 2).lineTo(subTableX + subTableWidth, doc.y - 2).stroke('#f1f5f9');
                    });
                    doc.moveDown(0.5);
                }
                
                doc.fontSize(10); // Reset font size for next contractor
            }
        });

        // --- FOOTER ---
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#94a3b8')
               .text(`Reporte generado por Plataforma OVAL Control para Abastible S.A. | Página ${i + 1} de ${pages.count}`, 
               0, 780, { align: 'center' });
        }

        doc.end();
        return doc;
    },

    async billingReportPdf(req, res) {
        try {
            const reportData = await module.exports._getBillingData();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=reporte-facturacion-oval.pdf');
            
            await module.exports._generateBillingPdf(reportData, res);
        } catch (error) {
            console.error('Billing PDF Error:', error);
            res.status(500).json({ message: 'Error generando PDF de facturación' });
        }
    },

    async billingReportExcel(req, res) {
        try {
            const reportData = await module.exports._getBillingData();
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Facturacion');

            sheet.columns = [
                { header: 'Contratista', key: 'nombre', width: 40 },
                { header: 'RUT', key: 'rut', width: 15 },
                { header: 'Contratos Facturables', key: 'cant', width: 20 },
                { header: 'Monto Unitario', key: 'unitario', width: 15 },
                { header: 'Monto Total', key: 'total', width: 15 }
            ];

            reportData.contratistas.forEach(c => {
                sheet.addRow({
                    nombre: c.nombre,
                    rut: c.rut,
                    cant: c.contratosFacturables,
                    unitario: reportData.montoUnitario,
                    total: c.montoTotal
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=reporte-facturacion.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Billing Excel Error:', error);
            res.status(500).json({ message: 'Error generando Excel de facturación' });
        }
    },

    async sendBillingReportEmail(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });

            const reportData = await module.exports._getBillingData();
            const emailService = require('../services/emailService');

            // 1. Generate PDF in memory using the same aesthetic helper
            const { PassThrough } = require('stream');
            const stream = new PassThrough();
            const buffers = [];
            stream.on('data', buffers.push.bind(buffers));

            await module.exports._generateBillingPdf(reportData, stream);

            // Wait for PDF to finish
            const pdfBuffer = await new Promise((resolve, reject) => {
                stream.on('end', () => resolve(Buffer.concat(buffers)));
                stream.on('error', reject);
            });

            // 2. Prepare HTML Email
            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: #003399; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">Reporte de Facturación Mensual</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Estimado(a),</p>
                        <p>Adjunto encontrará el reporte detallado de facturación de contratistas generado desde la plataforma <strong>OVAL Control</strong> para <strong>Abastible S.A.</strong></p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ea580c;">
                            <h4 style="margin: 0 0 15px 0; color: #1e293b;">Resumen Ejecutivo:</h4>
                            <table style="width: 100%; font-size: 14px;">
                                <tr>
                                    <td style="padding: 5px 0; color: #64748b;">Contratistas con Actividad:</td>
                                    <td style="padding: 5px 0; text-align: right; font-weight: bold;">${reportData.resumen.totalContratistas}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0; color: #64748b;">Total Contratos Facturables:</td>
                                    <td style="padding: 5px 0; text-align: right; font-weight: bold;">${reportData.resumen.totalContratosFacturables}</td>
                                </tr>
                                <tr style="font-size: 16px;">
                                    <td style="padding: 15px 0 5px 0; color: #1e293b; font-weight: bold;">Monto Total Proyectado:</td>
                                    <td style="padding: 15px 0 5px 0; text-align: right; font-weight: bold; color: #9a3412;">$${new Intl.NumberFormat('es-CL').format(reportData.resumen.montoGranTotal)} CLP</td>
                                </tr>
                            </table>
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
                            Este reporte contiene información confidencial de carácter comercial. El desglose detallado se encuentra disponible en el archivo PDF adjunto.
                        </p>
                    </div>
                    <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
                        © ${new Date().getFullYear()} Plataforma OVAL Control - Abastible | Sistema de Gestión Operacional
                    </div>
                </div>
            `;

            // 3. Send Email
            const success = await emailService.sendMail({
                to: email,
                subject: `[OVAL] Reporte de Facturación - ${new Date().toLocaleDateString('es-CL')}`,
                html,
                attachments: [
                    {
                        filename: `reporte-facturacion-oval-${new Date().toISOString().split('T')[0]}.pdf`,
                        content: pdfBuffer
                    }
                ]
            });

            if (success) {
                res.json({ success: true, message: 'Reporte enviado correctamente a ' + email });
            } else {
                res.status(500).json({ success: false, message: 'Error al enviar el email' });
            }

        } catch (error) {
            console.error('Send Billing Report Error:', error);
            res.status(500).json({ success: false, message: 'Error al procesar el envío del reporte' });
        }
    }
};
