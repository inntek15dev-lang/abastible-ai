const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Registro, RegistroActividad, Actividad, Hallazgo, User, Compromiso, Elemento, Vinculacion, Administracion, sequelize, Contratista, TipoContratista, Dependencia, Programa, Gerencia, Subgerencia } = require('../database/models');
const { Op } = require('sequelize');
const { getProgramaScope, intersectWithProgramaScope } = require('../utils/programaScopeHelper');
const { buildScopeWhere, getAllowedVinculacionIds } = require('../utils/scopeHelper');

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
            const stats = await module.exports._getStats(req, req.query.periodo);
            res.json({
                success: true,
                data: stats
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

            // Use exact A4 landscape dimensions (841.89 x 595.28 pt) with 18pt margins for maximum width
            const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 18, bufferPages: true });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=matriz-cumplimiento-${new Date().toISOString().slice(0, 10)}.pdf`);
            doc.pipe(res);

            const startX = 18;
            const totalWidth = 805; // 841.89 - (18 * 2) = ~805.89 pt
            const baseColsWidth = 365; // 140 (Contratista) + 140 (Programa) + 85 (Dependencia)
            const numMonths = Math.max(1, columns.length);
            const monthColWidth = Math.max(28, (totalWidth - baseColsWidth) / numMonths);

            const drawPageHeader = () => {
                // Top Corporate Bars (Abastible Blue & Orange)
                doc.rect(0, 0, 842, 5).fill('#003594');
                doc.rect(0, 5, 842, 2).fill('#FE5000');

                // Header Titles
                doc.fillColor('#003594').font('Helvetica-Bold').fontSize(13).text('MATRIZ DE CUMPLIMIENTO OIEM', startX, 16);
                doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Visión consolidada por vinculación: servicios con programa asignado', startX, 31);
                
                const nowFormatted = `${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
                doc.fontSize(7.5).text(`Fecha emisión: ${nowFormatted}  |  Total contratos: ${rows.length}`, 480, 18, { align: 'right', width: 343 });
            };

            const headerHeight = 32; // Generous 32pt height with clean vertical clearance
            const drawTableHeader = (y) => {
                doc.rect(startX, y, totalWidth, headerHeight).fill('#f8fafc');
                doc.rect(startX, y, totalWidth, headerHeight).stroke('#e2e8f0');

                let cx = startX;
                doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5);
                doc.text('CONTRATISTA / RUT', cx + 6, y + 11, { width: 130 });
                cx += 140;
                doc.text('PROGRAMA / SERVICIO', cx + 6, y + 11, { width: 130 });
                cx += 140;
                doc.text('DEPENDENCIA', cx, y + 11, { width: 85, align: 'center' });
                cx += 85;

                // Month header: Month name on line 1 (y+5), subheader on line 2 (y+19) -> 14pt vertical separation guarantees NO text overlap!
                columns.forEach(col => {
                    const cleanLabel = (col.label || '').replace(/SEPT/gi, 'SEP').replace(/DIC\./gi, 'DIC');
                    const monthFontSize = numMonths > 10 ? 5.8 : (numMonths > 8 ? 6.2 : 6.8);
                    const subFontSize = numMonths > 10 ? 4.6 : 5.0;
                    
                    doc.font('Helvetica-Bold').fontSize(monthFontSize).fillColor('#475569');
                    doc.text(cleanLabel, cx, y + 5, { width: monthColWidth, align: 'center', lineBreak: false });
                    
                    doc.font('Helvetica').fontSize(subFontSize).fillColor('#94a3b8');
                    const subLabel = monthColWidth < 38 ? 'DECL | AUD' : 'DECL. | AUDIT.';
                    doc.text(subLabel, cx, y + 19, { width: monthColWidth, align: 'center', lineBreak: false });
                    cx += monthColWidth;
                });

                return y + headerHeight;
            };

            drawPageHeader();
            let currentY = drawTableHeader(42);

            rows.forEach((row, rowIdx) => {
                // Pre-calculate needed text heights so no text is ever truncated with ellipsis
                doc.font('Helvetica-Bold').fontSize(6.8);
                const contratistaH = doc.heightOfString(row.contratista || 'N/A', { width: 130 });
                const programaH = doc.heightOfString(row.programa || 'Sin Programa', { width: 130 });
                
                doc.font('Helvetica').fontSize(6.0);
                const rutH = doc.heightOfString(row.rut || '-', { width: 130 });
                const servicioH = doc.heightOfString(row.servicio || '-', { width: 130 });

                // Dynamic row height accommodates complete multi-line text for both contractor & program
                const totalCol1H = contratistaH + rutH + 10;
                const totalCol2H = programaH + servicioH + 10;
                const rowHeight = Math.max(34, totalCol1H, totalCol2H);

                // Page break with automatic header repetition
                if (currentY + rowHeight > 550) {
                    doc.addPage({ size: 'A4', layout: 'landscape', margin: 18 });
                    drawPageHeader();
                    currentY = drawTableHeader(42);
                }

                let x = startX;

                // Subtle alternating row background for high readability
                if (rowIdx % 2 === 1) {
                    doc.rect(startX, currentY, totalWidth, rowHeight).fill('#fafbfc');
                }

                // 1. Contratista / RUT (Full text, wrapped onto multiple lines, NO ellipsis!)
                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(6.8).text(row.contratista || 'N/A', x + 5, currentY + 4, { width: 130 });
                doc.fillColor('#64748b').font('Helvetica').fontSize(6.0).text(row.rut || '-', x + 5, currentY + 4 + contratistaH + 2, { width: 130 });
                x += 140;

                // 2. Programa / Servicio (Full text, wrapped onto multiple lines, NO ellipsis!)
                doc.fillColor('#003594').font('Helvetica-Bold').fontSize(6.8).text(row.programa || 'Sin Programa', x + 5, currentY + 4, { width: 130 });
                doc.fillColor('#64748b').font('Helvetica').fontSize(6.0).text(row.servicio || '-', x + 5, currentY + 4 + programaH + 2, { width: 130 });
                x += 140;

                // 3. Dependencia (Vertically centered badge)
                const depBadgeH = Math.min(rowHeight - 8, 22);
                const depY = currentY + (rowHeight - depBadgeH) / 2;
                doc.rect(x + 3, depY, 79, depBadgeH).fill('#f1f5f9');
                doc.fillColor('#475569').font('Helvetica').fontSize(6.2).text(row.dependencia || '-', x + 5, depY + (depBadgeH - 8) / 2, { width: 75, align: 'center' });
                x += 85;

                // 4. Period Columns (Vertically centered cells with UI compliance colors)
                const centerY = currentY + (rowHeight - 20) / 2;
                columns.forEach(col => {
                    const cell = row.data[col.key];
                    if (cell) {
                        const val = parseFloat(cell.declarado || 0);
                        let cellBg = '#f0fdf4';
                        let textColor = '#059669';

                        if (val >= 85) {
                            cellBg = '#f0fdf4';
                            textColor = '#059669';
                        } else if (val >= 70) {
                            cellBg = '#fefce8';
                            textColor = '#d97706';
                        } else {
                            cellBg = '#fef2f2';
                            textColor = '#dc2626';
                        }

                        // Background tinted box
                        doc.rect(x + 1, currentY + 1, monthColWidth - 2, rowHeight - 2).fill(cellBg);

                        // Declared & Audited %
                        const decStr = `${cell.declarado}%` + (cell.auditado !== null && cell.auditado !== undefined ? ` | ${cell.auditado}%` : '');
                        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(numMonths > 8 ? 6.2 : 6.8);
                        doc.text(decStr, x, centerY + 1, { width: monthColWidth, align: 'center' });

                        // Status Badge Text
                        const estStr = (cell.estado || '').replace(/_/g, ' ').toUpperCase();
                        doc.fillColor(textColor).font('Helvetica').fontSize(numMonths > 8 ? 4.8 : 5.2);
                        doc.text(estStr, x, centerY + 11, { width: monthColWidth, align: 'center' });
                    } else {
                        doc.fillColor('#cbd5e1').font('Helvetica').fontSize(8);
                        doc.text('-', x, currentY + (rowHeight - 8) / 2, { width: monthColWidth, align: 'center' });
                    }
                    x += monthColWidth;
                });

                currentY += rowHeight;
                doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke('#e2e8f0');
            });

            // Footers with numbering on all pages
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.moveTo(startX, 568).lineTo(startX + totalWidth, 568).stroke('#e2e8f0');
                doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
                   .text('Abastible S.A. | Sistema de Gestión de Cumplimiento OIEM - Matriz Ejecutiva', startX, 574);
                doc.text(`Página ${i + 1} de ${pages.count}`, startX, 574, { align: 'right', width: totalWidth });
            }

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
        const { contratista_id, servicio_id, dependencia_id, programa_id, periodo, periodo_desde, periodo_hasta, adc_id, tiene_registros, gerencia_id, subgerencia_id } = req.query;

        const whereVinculacion = { activo: 1 };
        let allowedContratistaIds = null; // null = sin restricción (admin/oval)

        // 1. Role Scope (Filtro Universal por Rol)
        const allowedVincIds = await getAllowedVinculacionIds(user);
        if (allowedVincIds !== null) {
            whereVinculacion.id = { [Op.in]: allowedVincIds.length > 0 ? allowedVincIds : [-1] };
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

        // ADC filter
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

        // Gerencia / Subgerencia
        if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
            if (subgerencia_id && subgerencia_id !== 'todas') {
                whereVinculacion.subgerencia_id = subgerencia_id;
            } else if (gerencia_id && gerencia_id !== 'todas') {
                const subgs = await Subgerencia.findAll({
                    where: { gerencia_id: gerencia_id, activo: 1 },
                    attributes: ['id']
                });
                const subgIds = subgs.map(s => s.id);
                whereVinculacion.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
            }
        }

        // 3. Date Range
        const pad = (n) => String(n).padStart(2, '0');
        let startIsoMonth, endIsoMonth;
        if (periodo_desde && periodo_hasta) {
            startIsoMonth = periodo_desde;
            endIsoMonth = periodo_hasta;
        } else {
            const now = periodo ? new Date(periodo + '-01') : new Date();
            const curY = now.getFullYear();
            const curM = now.getMonth();
            const startD = new Date(curY, curM - 5, 1);
            startIsoMonth = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}`;
            endIsoMonth = `${curY}-${pad(curM + 1)}`;
        }

        const startMonth = new Date(startIsoMonth + '-01');
        const [endY, endM] = endIsoMonth.split('-').map(Number);
        const endMonth = new Date(endY, endM, 0);

        // Subquery for tiene_registros
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
                    required: !soloHuerfanosMatrixData,
                    where: !soloHuerfanosMatrixData ? {
                        programa_id: {
                            [Op.and]: [
                                { [Op.not]: null },
                                { [Op.ne]: '' },
                                { [Op.ne]: 0 },
                                { [Op.ne]: 'null' }
                            ]
                        }
                    } : undefined,
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
        const [desdeY, desdeM] = startIsoMonth.split('-').map(Number);
        const [hastaY, hastaM] = endIsoMonth.split('-').map(Number);

        let curColY = desdeY;
        let curColM = desdeM;

        const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        while (curColY < hastaY || (curColY === hastaY && curColM <= hastaM)) {
            const key = `${curColY}-${pad(curColM)}`;
            const label = `${monthNames[curColM - 1]} ${curColY}`;
            columns.push({ key, label });
            curColM++;
            if (curColM > 12) {
                curColM = 1;
                curColY++;
            }
        }

        return { columns, rows };
    },

    // Internal helper to avoid code duplication
    async _getStats(req, periodoParam) {
        const user = req.user;
        const whereRegistro = await buildScopeWhere(user);
        const { fecha_inicio, fecha_fin, periodo_desde, periodo_hasta, programa_id, servicio_id, dependencia_id, search, gerencia_id, subgerencia_id, adc_id } = req.query;

        // 1. Filtro ADC
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

        // 2. Filtro Gerencia / Subgerencia
        if ((gerencia_id && gerencia_id !== 'todas') || (subgerencia_id && subgerencia_id !== 'todas')) {
            const vincWhere = { activo: 1 };
            if (subgerencia_id && subgerencia_id !== 'todas') {
                vincWhere.subgerencia_id = subgerencia_id;
            } else if (gerencia_id && gerencia_id !== 'todas') {
                const subgs = await Subgerencia.findAll({
                    where: { gerencia_id: gerencia_id, activo: 1 },
                    attributes: ['id']
                });
                const subgIds = subgs.map(s => s.id);
                vincWhere.subgerencia_id = { [Op.in]: subgIds.length > 0 ? subgIds : [-1] };
            }

            const vincsInHierarchy = await Vinculacion.findAll({
                where: vincWhere,
                attributes: ['id']
            });
            const vincIdsFromHierarchy = vincsInHierarchy.map(v => v.id);

            if (whereRegistro.contratista_asignacion_id) {
                const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                const intersection = existingIds.filter(id => vincIdsFromHierarchy.includes(id));
                whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
            } else {
                whereRegistro.contratista_asignacion_id = { [Op.in]: vincIdsFromHierarchy.length > 0 ? vincIdsFromHierarchy : [-1] };
            }
        }

        // 3. Filtro Servicio
        if (servicio_id && servicio_id !== 'todos') {
            const vincsWithService = await Vinculacion.findAll({
                where: { servicio_id: servicio_id, activo: 1 },
                attributes: ['id']
            });
            const serviceVincIds = vincsWithService.map(v => v.id);

            if (whereRegistro.contratista_asignacion_id) {
                const existingIds = whereRegistro.contratista_asignacion_id[Op.in] || [];
                const intersection = existingIds.filter(id => serviceVincIds.includes(id));
                whereRegistro.contratista_asignacion_id = { [Op.in]: intersection.length > 0 ? intersection : [-1] };
            } else {
                whereRegistro.contratista_asignacion_id = { [Op.in]: serviceVincIds.length > 0 ? serviceVincIds : [-1] };
            }
        }

        // 4. Filtros Atributos Directos
        if (programa_id && programa_id !== 'todos') whereRegistro.programa_id = programa_id;
        if (dependencia_id && dependencia_id !== 'todas') whereRegistro.dependencia_id = dependencia_id;
        if (search) whereRegistro.eecc_nombre = { [Op.like]: `%${search}%` };

        // 5. Filtro de Rango de Fechas / Periodo
        const startStr = fecha_inicio || periodo_desde || (periodoParam || req.query.periodo || null);
        const endStr = fecha_fin || periodo_hasta || null;

        if (startStr || endStr) {
            const dateFilter = {};
            if (startStr) {
                dateFilter[Op.gte] = new Date(startStr + '-01');
            }
            if (endStr) {
                const d = new Date(endStr + '-01');
                d.setMonth(d.getMonth() + 1);
                dateFilter[Op.lt] = d;
            } else if (startStr && !endStr && (periodoParam || req.query.periodo || periodo_desde)) {
                const d = new Date(startStr + '-01');
                d.setMonth(d.getMonth() + 1);
                dateFilter[Op.lt] = d;
            }
            whereRegistro.periodo = dateFilter;
        }

        // 6. Filtro global programa scope
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
                periodo: String(r.periodo).slice(0, 7),
                eecc: r.eecc_nombre || 'N/A',
                cumplimiento: parseFloat(r.porcentaje_cumplimiento || 0),
                estado: parseFloat(r.porcentaje_cumplimiento || 0) >= 85 ? 'Cumple meta' : 'Bajo meta',
                statusClass: parseFloat(r.porcentaje_cumplimiento || 0) >= 85 ? 'ok' : 'bad'
            }))
        };
    },

    async billingReport(req, res) {
        try {
            const { periodo } = req.query;
            const reportData = await module.exports._getBillingData(periodo);
            res.json({
                success: true,
                data: reportData
            });
        } catch (error) {
            console.error('Billing Report Error:', error);
            res.status(500).json({ success: false, message: 'Error al generar reporte de facturación' });
        }
    },

    async _getBillingData(periodoFilter) {
        const { Registro } = require('../database/models');
        
        const MONTH_NAMES_ES = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        const formatPeriodName = (periodStr) => {
            if (!periodStr) return '';
            const parts = String(periodStr).split('-');
            if (parts.length < 2) return String(periodStr);
            const year = parts[0];
            const monthIdx = parseInt(parts[1], 10) - 1;
            if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return String(periodStr);
            return `${MONTH_NAMES_ES[monthIdx]} ${year}`;
        };

        // Build Registro filter condition
        const registroWhere = {};
        if (periodoFilter) {
            registroWhere.periodo = { [Op.like]: `${periodoFilter}%` };
        }

        // Fetch Contractors with active vinculaciones that have an active program AND at least 1 created Registro
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
                            where: registroWhere,
                            required: true // Contabilizar exclusivamente vinculaciones con registros de cumplimiento creados
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
                    detalleContratos: billableContracts.map(v => {
                        const periodosSet = new Set();
                        v.registros.forEach(r => {
                            if (r.periodo) {
                                periodosSet.add(formatPeriodName(r.periodo));
                            }
                        });
                        const periodosArray = Array.from(periodosSet);
                        return {
                            id: v.id,
                            numero_contrato: v.numero_contrato,
                            servicio: v.servicio.nombre,
                            programa: v.servicio.programa.nombre,
                            dependencia: v.dependencia?.nombre || 'N/A',
                            totalRegistros: v.registros.length,
                            periodosRegistros: periodosArray,
                            periodosTexto: periodosArray.length > 0 ? `Registros encontrados: ${periodosArray.join(', ')}` : 'Sin registros'
                        };
                    })
                };
            })
            .filter(c => c.contratosFacturables > 0 && !c.nombre.toUpperCase().includes('DEMO'));

        return {
            periodoFiltro: periodoFilter ? formatPeriodName(periodoFilter) : 'Todos los periodos',
            contratistas: mappedContratistas,
            resumen: {
                totalContratistas: mappedContratistas.length,
                totalContratosFacturables: mappedContratistas.reduce((acc, c) => acc + c.contratosFacturables, 0)
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
        const cardWidth = 230;
        
        // Card 1: Total Contratistas
        doc.rect(50, startY, cardWidth, 60).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).text('CONTRATISTAS CON ACTIVIDAD', 65, startY + 15);
        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(reportData.resumen.totalContratistas.toString(), 65, startY + 30);

        // Card 2: Contratos
        doc.rect(320, startY, cardWidth, 60).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#64748b').fontSize(8).text('CONTRATOS FACTURABLES', 335, startY + 15);
        doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text(reportData.resumen.totalContratosFacturables.toString(), 335, startY + 30);

        doc.moveDown(6);

        // --- TABLE HEADER ---
        doc.fillColor('#003399').fontSize(12).font('Helvetica-Bold').text('DETALLE DE REGISTROS POR EMPRESA', { underline: true });
        doc.moveDown();

        // Table Columns Helper
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 320;
        const col3 = 450;

        doc.fontSize(10).fillColor('#475569');
        doc.text('Empresa Contratista', col1, tableTop);
        doc.text('RUT', col2, tableTop);
        doc.text('Contratos Facturables', col3, tableTop);
        
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
                doc.text(c.nombre, col1, rowY, { width: 250 });
                doc.text(c.rut, col2, rowY);
                doc.font('Helvetica-Bold').text(c.contratosFacturables.toString(), col3, rowY);
                
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
            const { periodo } = req.query;
            const reportData = await module.exports._getBillingData(periodo);
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
            const { periodo } = req.query;
            const reportData = await module.exports._getBillingData(periodo);
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Facturacion');

            sheet.columns = [
                { header: 'Empresa Contratista', key: 'nombre', width: 35 },
                { header: 'RUT', key: 'rut', width: 15 },
                { header: 'N° Contrato', key: 'numero_contrato', width: 15 },
                { header: 'Programa / Servicio', key: 'servicio', width: 35 },
                { header: 'Dependencia', key: 'dependencia', width: 25 },
                { header: 'Registros Encontrados', key: 'periodos', width: 35 }
            ];

            reportData.contratistas.forEach(c => {
                c.detalleContratos.forEach(v => {
                    sheet.addRow({
                        nombre: c.nombre,
                        rut: c.rut,
                        numero_contrato: v.numero_contrato,
                        servicio: `${v.servicio} (${v.programa})`,
                        dependencia: v.dependencia,
                        periodos: v.periodosRegistros?.join(', ') || 'Sin registros'
                    });
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
            const { email, periodo } = req.body;
            if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });

            const reportData = await module.exports._getBillingData(periodo);
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
    },

    async _getHallazgosReportData(req) {
        const {
            estado,
            tipo,
            contratista_id,
            servicio_id,
            dependencia_id,
            gerencia_id,
            subgerencia_id,
            programa_id,
            periodo_desde,
            periodo_hasta,
            search
        } = req.query;

        const where = {};
        if (estado && estado !== 'todos' && estado !== 'all') where.estado = estado;
        if (tipo && tipo !== 'todos' && tipo !== 'all') where.tipo = tipo;

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            where[Op.or] = [
                { descripcion: { [Op.like]: term } },
                { accion_correctiva: { [Op.like]: term } }
            ];
        }

        const allowedVincIds = await getAllowedVinculacionIds(req.user);
        if (allowedVincIds !== null && allowedVincIds.length === 0) return [];

        const vincWhere = {};
        if (contratista_id && contratista_id !== 'todos') vincWhere.contratista_id = contratista_id;
        if (servicio_id && servicio_id !== 'todos') vincWhere.servicio_id = servicio_id;
        if (dependencia_id && dependencia_id !== 'todas') vincWhere.dependencia_id = dependencia_id;
        if (gerencia_id && gerencia_id !== 'todas') vincWhere.gerencia_id = gerencia_id;
        if (subgerencia_id && subgerencia_id !== 'todas') vincWhere.subgerencia_id = subgerencia_id;

        const registroWhere = {};
        if (allowedVincIds !== null) {
            registroWhere.contratista_asignacion_id = { [Op.in]: allowedVincIds };
        }
        if (programa_id && programa_id !== 'todos') {
            registroWhere.programa_id = programa_id;
        }
        if (periodo_desde && periodo_hasta) {
            registroWhere.periodo = { [Op.between]: [periodo_desde, periodo_hasta] };
        } else if (periodo_desde) {
            registroWhere.periodo = { [Op.gte]: periodo_desde };
        } else if (periodo_hasta) {
            registroWhere.periodo = { [Op.lte]: periodo_hasta };
        }

        return await Hallazgo.findAll({
            where,
            include: [
                { model: User, as: 'auditor', attributes: ['id', 'name', 'email'] },
                { model: Compromiso, as: 'compromisos' },
                {
                    model: RegistroActividad,
                    as: 'registroActividad',
                    include: [
                        {
                            model: Actividad,
                            as: 'actividad',
                            include: [
                                {
                                    model: Elemento,
                                    as: 'elemento',
                                    include: [{ model: Programa, as: 'programa' }]
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Registro,
                    as: 'registro',
                    where: registroWhere,
                    required: true,
                    include: [
                        {
                            model: Vinculacion,
                            as: 'vinculacionEntidad',
                            where: Object.keys(vincWhere).length > 0 ? vincWhere : undefined,
                            required: Object.keys(vincWhere).length > 0,
                            include: [
                                { model: Contratista, as: 'contratista' },
                                { model: TipoContratista, as: 'servicio' },
                                { model: Dependencia, as: 'dependencia' },
                                { model: Gerencia, as: 'gerencia' },
                                { model: Subgerencia, as: 'subgerencia' }
                            ]
                        },
                        { model: Programa, as: 'programa' }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    },

    async hallazgosExcel(req, res) {
        try {
            const hallazgos = await module.exports._getHallazgosReportData(req);

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Reporte de Hallazgos', {
                views: [{ showGridLines: true }]
            });

            // Corporate Header Style
            sheet.mergeCells('A1:J1');
            const titleCell = sheet.getCell('A1');
            titleCell.value = 'ABASTIBLE S.A. - REPORTE OFICIAL DE GESTIÓN DE HALLAZGOS OIEM';
            titleCell.font = { name: 'Helvetica', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003594' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).height = 30;

            sheet.mergeCells('A2:J2');
            const metaCell = sheet.getCell('A2');
            metaCell.value = `Fecha Emisión: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')} | Total Hallazgos: ${hallazgos.length}`;
            metaCell.font = { size: 10, italic: true, color: { argb: 'FF475569' } };
            metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(2).height = 20;

            sheet.addRow([]);

            // Headers
            const headers = [
                'ID',
                'Programa',
                'Elemento',
                'Actividad',
                'Empresa Contratista',
                'Planta / Dependencia',
                'Servicio',
                'Período',
                'Clasificación',
                'Estado',
                'Fecha Detección',
                'Fecha Límite',
                'Fecha Cierre',
                'Auditor',
                'Descripción del Hallazgo',
                'Plan de Acción'
            ];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'medium', color: { argb: 'FFFE5000' } }
                };
            });

            hallazgos.forEach((h) => {
                const act = h.registroActividad?.actividad;
                const elem = act?.elemento;
                const prog = elem?.programa || h.registro?.programa;
                const vinc = h.registro?.vinculacionEntidad;

                const row = sheet.addRow([
                    `#${h.id}`,
                    prog?.nombre || 'General',
                    elem ? `${elem.codigo || ''} - ${elem.nombre || ''}` : '-',
                    act ? `${act.codigo || ''} - ${act.nombre || ''}` : '-',
                    vinc?.contratista?.nombre || h.registro?.eecc_nombre || 'N/A',
                    vinc?.dependencia?.nombre || '-',
                    vinc?.servicio?.nombre || '-',
                    h.registro?.periodo || '-',
                    (h.tipo || '').replace(/_/g, ' ').toUpperCase(),
                    (h.estado || '').replace(/_/g, ' ').toUpperCase(),
                    h.created_at ? new Date(h.created_at).toLocaleDateString('es-CL') : '-',
                    h.fecha_limite || '-',
                    h.fecha_cierre ? new Date(h.fecha_cierre).toLocaleDateString('es-CL') : '-',
                    h.auditor?.name || '-',
                    h.descripcion || '',
                    h.accion_correctiva || '-'
                ]);

                row.alignment = { vertical: 'middle', wrapText: true };
            });

            sheet.columns.forEach((col, idx) => {
                col.width = [8, 22, 22, 24, 26, 20, 20, 12, 16, 14, 14, 14, 14, 18, 35, 30][idx] || 15;
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=reporte-hallazgos-${new Date().toISOString().slice(0, 10)}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Hallazgos Excel Error:', error);
            res.status(500).json({ success: false, message: 'Error generando Excel de hallazgos' });
        }
    },

    async hallazgosPdf(req, res) {
        try {
            const hallazgos = await module.exports._getHallazgosReportData(req);

            const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 18, bufferPages: true });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reporte-hallazgos-${new Date().toISOString().slice(0, 10)}.pdf`);
            doc.pipe(res);

            const startX = 18;
            const totalWidth = 805;

            const drawPageHeader = () => {
                doc.rect(0, 0, 842, 5).fill('#003594');
                doc.rect(0, 5, 842, 2).fill('#FE5000');
                doc.fillColor('#003594').font('Helvetica-Bold').fontSize(13).text('ABASTIBLE S.A. | REPORTE OFICIAL DE GESTIÓN DE HALLAZGOS', startX, 16);
                doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('No conformidades, desviaciones y observaciones de auditoría operacional OIEM', startX, 31);
                const nowFormatted = `${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
                doc.fontSize(7.5).text(`Fecha emisión: ${nowFormatted}  |  Total hallazgos: ${hallazgos.length}`, 480, 18, { align: 'right', width: 343 });
            };

            const headerHeight = 22;
            const drawTableHeader = (y) => {
                doc.rect(startX, y, totalWidth, headerHeight).fill('#f8fafc');
                doc.rect(startX, y, totalWidth, headerHeight).stroke('#e2e8f0');
                doc.fillColor('#475569').font('Helvetica-Bold').fontSize(6.8);

                let cx = startX;
                doc.text('ID', cx + 4, y + 7, { width: 30 }); cx += 32;
                doc.text('PROGRAMA / ELEMENTO', cx + 4, y + 7, { width: 140 }); cx += 145;
                doc.text('ACTIVIDAD EVALUADA', cx + 4, y + 7, { width: 140 }); cx += 145;
                doc.text('CONTRATISTA / PLANTA', cx + 4, y + 7, { width: 130 }); cx += 135;
                doc.text('TIPO', cx + 4, y + 7, { width: 70, align: 'center' }); cx += 75;
                doc.text('ESTADO', cx + 4, y + 7, { width: 65, align: 'center' }); cx += 70;
                doc.text('DESCRIPCIÓN / HALLAZGO', cx + 4, y + 7, { width: 200 });

                return y + headerHeight;
            };

            drawPageHeader();
            let currentY = drawTableHeader(44);

            hallazgos.forEach((h, idx) => {
                const act = h.registroActividad?.actividad;
                const elem = act?.elemento;
                const prog = elem?.programa || h.registro?.programa;
                const vinc = h.registro?.vinculacionEntidad;

                const descH = doc.heightOfString(h.descripcion || '-', { width: 195 });
                const rowHeight = Math.max(28, descH + 12);

                if (currentY + rowHeight > 550) {
                    doc.addPage({ size: 'A4', layout: 'landscape', margin: 18 });
                    drawPageHeader();
                    currentY = drawTableHeader(44);
                }

                if (idx % 2 === 1) {
                    doc.rect(startX, currentY, totalWidth, rowHeight).fill('#fafbfc');
                }

                let x = startX;
                doc.fillColor('#64748b').font('Helvetica').fontSize(6.5).text(`#${h.id}`, x + 4, currentY + 6, { width: 30 }); x += 32;

                doc.fillColor('#003594').font('Helvetica-Bold').fontSize(6.5).text(prog?.nombre || 'General', x + 4, currentY + 5, { width: 135 });
                doc.fillColor('#64748b').font('Helvetica').fontSize(5.8).text(elem ? `${elem.codigo} ${elem.nombre}` : '-', x + 4, currentY + 14, { width: 135 });
                x += 145;

                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(6.2).text(act?.codigo || '-', x + 4, currentY + 5, { width: 135 });
                doc.fillColor('#64748b').font('Helvetica').fontSize(5.8).text(act?.nombre || '-', x + 4, currentY + 14, { width: 135 });
                x += 145;

                doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(6.5).text(vinc?.contratista?.nombre || h.registro?.eecc_nombre || '-', x + 4, currentY + 5, { width: 125 });
                doc.fillColor('#64748b').font('Helvetica').fontSize(5.8).text(vinc?.dependencia?.nombre || '-', x + 4, currentY + 14, { width: 125 });
                x += 135;

                // Tipo Badge
                doc.rect(x + 2, currentY + 5, 68, 14).fill('#f1f5f9');
                doc.fillColor('#475569').font('Helvetica-Bold').fontSize(5.5).text((h.tipo || '').replace(/_/g, ' ').toUpperCase(), x + 2, currentY + 8, { width: 68, align: 'center' });
                x += 75;

                // Estado Badge
                const isCerrado = h.estado === 'cerrado';
                const isProceso = h.estado === 'en_proceso';
                const stBg = isCerrado ? '#f0fdf4' : (isProceso ? '#fefce8' : '#fef2f2');
                const stTx = isCerrado ? '#059669' : (isProceso ? '#d97706' : '#dc2626');
                doc.rect(x + 2, currentY + 5, 62, 14).fill(stBg);
                doc.fillColor(stTx).font('Helvetica-Bold').fontSize(5.8).text((h.estado || '').replace(/_/g, ' ').toUpperCase(), x + 2, currentY + 8, { width: 62, align: 'center' });
                x += 70;

                doc.fillColor('#334155').font('Helvetica').fontSize(6.0).text(h.descripcion || '-', x + 4, currentY + 5, { width: 195 });

                currentY += rowHeight;
                doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke('#e2e8f0');
            });

            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.moveTo(startX, 568).lineTo(startX + totalWidth, 568).stroke('#e2e8f0');
                doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
                   .text('Abastible S.A. | Sistema de Gestión de Auditoría y Cumplimiento OIEM', startX, 574);
                doc.text(`Página ${i + 1} de ${pages.count}`, startX, 574, { align: 'right', width: totalWidth });
            }

            doc.end();
        } catch (error) {
            console.error('Hallazgos PDF Error:', error);
            res.status(500).json({ success: false, message: 'Error generando PDF de hallazgos' });
        }
    }

};
