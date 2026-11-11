// IEEE Trace: REQ-010 | US-010 | utils/pendientesPdfReport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

let cachedLogoDataUrl = null;

async function getLogoDataUrl() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 200;
            canvas.height = img.naturalHeight || 50;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            cachedLogoDataUrl = canvas.toDataURL('image/png');
            resolve(cachedLogoDataUrl);
        };
        img.onerror = () => {
            const pngImg = new Image();
            pngImg.crossOrigin = 'Anonymous';
            pngImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = pngImg.naturalWidth || 200;
                canvas.height = pngImg.naturalHeight || 50;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(pngImg, 0, 0);
                cachedLogoDataUrl = canvas.toDataURL('image/png');
                resolve(cachedLogoDataUrl);
            };
            pngImg.onerror = () => resolve(null);
            pngImg.src = '/logo.png';
        };
        img.src = '/logo.svg';
    });
}

/**
 * Standard Corporate Header - Matriz de Cumplimiento Benchmark
 */
function drawStandardCorporateHeader(doc, { title, subtitle, user, logoDataUrl, pageWidth, marginX }) {
    // 1. Top Blue Bar
    doc.setFillColor(0, 53, 148); // #003594
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    // 2. Orange Accent Line
    doc.setFillColor(254, 80, 0); // #FE5000
    doc.rect(0, 2.5, pageWidth, 1.0, 'F');

    // 3. Header Background Area (White)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 3.5, pageWidth, 18, 'F');

    // 4. Logo Abastible
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', marginX, 5.5, 34, 7.82);
    }

    const titleX = logoDataUrl ? 54 : marginX;

    // 5. Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 53, 148);
    doc.text(title, titleX, 10.5);

    // 6. Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, titleX, 15.5);

    // 7. Emisión info right aligned
    const nowStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha emisión: ${nowStr} ${timeStr}`, pageWidth - marginX, 10.5, { align: 'right' });
    if (user?.name || user?.email) {
        doc.text(`Generado por: ${user.name || user.email}`, pageWidth - marginX, 15.5, { align: 'right' });
    }

    // 8. Divider line below header
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, 20.5, pageWidth - marginX, 20.5);
}

/**
 * Standard Metadata & Context Box
 */
function drawStandardContextBox(doc, { itemsCount, periodoLabel, filterEstado, customLabel, marginX, printableWidth }) {
    const metaY = 22.5;
    const metaHeight = 11;
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, metaY, printableWidth, metaHeight, 2, 2, 'FD');

    doc.setFontSize(7.2);

    // Row 1: KPI Counters
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TOTAL REGISTROS:', marginX + 4, metaY + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 53, 148);
    doc.text(`${itemsCount} item(s)`, marginX + 32, metaY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PERIODO:', marginX + 68, metaY + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(periodoLabel || 'Todos los Periodos', marginX + 83, metaY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ESTADO:', marginX + 145, metaY + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(filterEstado || 'Todos').toUpperCase(), marginX + 159, metaY + 4.8);

    // Row 2: Subtitle info
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ORIGEN:', marginX + 4, metaY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(customLabel || 'Módulo Pendientes de Acción • Plataforma OVAL Control', marginX + 18, metaY + 9);
}

/**
 * Standard Running Footer
 */
function applyStandardFooter(doc, { pageWidth, pageHeight, marginX, title }) {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Abastible S.A. | Sistema de Gestión de Cumplimiento OIEM - ${title}`, marginX, pageHeight - 6);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
    }
}

/**
 * 1. REPORTE: Solicitudes de Reapertura
 */
export async function generateSolicitudesReaperturaPDF({ solicitudes = [], periodoLabel = 'Todos', filterEstado = 'todos', user = {} }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const marginX = 14;
    const printableWidth = pageWidth - (marginX * 2);

    const logoDataUrl = await getLogoDataUrl();

    drawStandardCorporateHeader(doc, {
        title: 'SOLICITUDES DE REAPERTURA',
        subtitle: 'Gestión de solicitudes de reapertura de registros de cumplimiento',
        user,
        logoDataUrl,
        pageWidth,
        marginX
    });

    drawStandardContextBox(doc, {
        itemsCount: solicitudes.length,
        periodoLabel,
        filterEstado,
        customLabel: 'Módulo Pendientes • Solicitudes de reapertura de autoevaluaciones cerradas',
        marginX,
        printableWidth
    });

    const tableHeaders = [[
        '#',
        'EMPRESA / CONTRATISTA',
        'Nº CONTRATO / SERVICIO / DEPENDENCIA',
        'PERIODO / PROGRAMA',
        'MOTIVO DE SOLICITUD',
        'ESTADO',
        'FECHA SOLICITUD',
        'RESPUESTA / RESOLUCIÓN'
    ]];

    const tableData = solicitudes.map((sol) => {
        const reg = sol.registro;
        const vinc = reg?.vinculacionEntidad || reg?.asignacion;
        const eecc = reg?.eecc_nombre || vinc?.contratista?.nombre || 'N/A';
        const numContrato = vinc?.numero_contrato || reg?.numero_contrato;
        const contratoStr = numContrato ? (String(numContrato).toLowerCase().startsWith('contrato') ? numContrato : `Contrato N° ${numContrato}`) : (vinc?.servicio?.nombre || 'Servicio');
        const servDep = `${vinc?.servicio?.nombre || 'N/A'} • ${vinc?.dependencia?.nombre || reg?.dependencia || 'N/A'}`;
        const periodoStr = reg?.periodo || sol.periodo || '-';
        const progStr = reg?.programa?.nombre || 'Estándar OIEM';
        const motivo = sol.motivo || '-';
        const estado = sol.estado === 'pendiente' ? 'PENDIENTE' : (sol.estado === 'aprobada' ? 'APROBADA' : 'RECHAZADA');
        const fecha = sol.created_at ? new Date(sol.created_at).toLocaleDateString('es-CL') : '-';
        const resp = sol.respuesta ? sol.respuesta : (sol.estado === 'pendiente' ? 'Pendiente de resolución' : '-');

        return [
            `#${sol.id}`,
            `${eecc}\nID Reg: #${sol.registro_id || '-'}`,
            `${contratoStr}\n${servDep}`,
            `${periodoStr}\n${progStr}`,
            motivo,
            estado,
            fecha,
            resp
        ];
    });

    autoTable(doc, {
        startY: 36,
        head: tableHeaders,
        body: tableData,
        showHead: 'everyPage',
        margin: { left: marginX, right: marginX, top: 24, bottom: 14 },
        theme: 'grid',
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [71, 85, 105],
            fontSize: 6.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
            lineWidth: 0.2,
            lineColor: [226, 232, 240]
        },
        styles: {
            fontSize: 6.3,
            cellPadding: 2,
            valign: 'middle',
            overflow: 'linebreak',
            lineColor: [241, 245, 249],
            lineWidth: 0.2
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 42 },
            2: { cellWidth: 45 },
            3: { cellWidth: 32 },
            4: { cellWidth: 62 },
            5: { cellWidth: 24, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 32 }
        },
        didParseCell: (data) => {
            if (data.section === 'head') {
                if (data.column.index >= 1 && data.column.index <= 4) {
                    data.cell.styles.halign = 'left';
                }
            }
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [100, 116, 139];
                } else if (data.column.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                } else if (data.column.index === 5) {
                    data.cell.styles.fontStyle = 'bold';
                    const st = String(data.cell.raw).toUpperCase();
                    if (st.includes('APROBADA')) {
                        data.cell.styles.fillColor = [220, 252, 231];
                        data.cell.styles.textColor = [22, 101, 52];
                    } else if (st.includes('RECHAZADA')) {
                        data.cell.styles.fillColor = [254, 226, 226];
                        data.cell.styles.textColor = [153, 27, 27];
                    } else {
                        data.cell.styles.fillColor = [254, 249, 195];
                        data.cell.styles.textColor = [133, 77, 14];
                    }
                }
            }
        }
    });

    applyStandardFooter(doc, { pageWidth, pageHeight, marginX, title: 'Solicitudes de Reapertura' });
    const nowStamp = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Solicitudes_Reapertura_${nowStamp}.pdf`);
}

/**
 * 2. REPORTE: Registros Pendientes de Creación
 */
export async function generatePendientesCreacionPDF({ pendientesCreacion = [], periodoLabel = 'Todos', filterEstado = 'todos', user = {} }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const marginX = 14;
    const printableWidth = pageWidth - (marginX * 2);

    const logoDataUrl = await getLogoDataUrl();

    drawStandardCorporateHeader(doc, {
        title: 'REGISTROS PENDIENTES DE CREACIÓN',
        subtitle: 'Vinculaciones activas sin autoevaluación creada o en estado borrador',
        user,
        logoDataUrl,
        pageWidth,
        marginX
    });

    drawStandardContextBox(doc, {
        itemsCount: pendientesCreacion.length,
        periodoLabel,
        filterEstado,
        customLabel: 'Módulo Pendientes • Vinculaciones con obligación de declarar cumplimiento mensual',
        marginX,
        printableWidth
    });

    const tableHeaders = [[
        '#',
        'EMPRESA CONTRATISTA',
        'RUT',
        'Nº CONTRATO / SERVICIO',
        'DEPENDENCIA / PLANTA',
        'PERIODO EVALUADO',
        'ESTADO DE REGISTRO',
        'TIPO ACCIÓN'
    ]];

    const tableData = pendientesCreacion.map((item, idx) => {
        const vinc = item.vinculacion;
        const eecc = vinc?.contratista?.nombre || vinc?.eecc_nombre || 'N/A';
        const rut = vinc?.contratista?.rut || '-';
        const numContrato = vinc?.numero_contrato ? `Contrato N° ${vinc.numero_contrato}` : (vinc?.servicio?.nombre || 'Servicio');
        const servicio = vinc?.servicio?.nombre || 'General';
        const dependencia = vinc?.dependencia?.nombre || 'N/A';
        
        let periodoStr = item.periodo;
        if (item.date) {
            const formattedDate = item.date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
            periodoStr = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        }
        if (item.isCurrentMonth) {
            periodoStr += ' (MES ACTUAL)';
        }

        const estado = item.action === 'complete' ? 'EN BORRADOR' : 'POR CREAR';
        const accion = item.action === 'complete' ? 'Completar Registro' : 'Crear Registro';

        return [
            `${idx + 1}`,
            eecc,
            rut,
            `${numContrato}\n${servicio}`,
            dependencia,
            periodoStr,
            estado,
            accion
        ];
    });

    autoTable(doc, {
        startY: 36,
        head: tableHeaders,
        body: tableData,
        showHead: 'everyPage',
        margin: { left: marginX, right: marginX, top: 24, bottom: 14 },
        theme: 'grid',
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [71, 85, 105],
            fontSize: 6.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
            lineWidth: 0.2,
            lineColor: [226, 232, 240]
        },
        styles: {
            fontSize: 6.3,
            cellPadding: 2,
            valign: 'middle',
            overflow: 'linebreak',
            lineColor: [241, 245, 249],
            lineWidth: 0.2
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 54 },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 50 },
            4: { cellWidth: 40 },
            5: { cellWidth: 38 },
            6: { cellWidth: 28, halign: 'center' },
            7: { cellWidth: 25, halign: 'center' }
        },
        didParseCell: (data) => {
            if (data.section === 'head') {
                if (data.column.index === 1 || data.column.index === 3 || data.column.index === 4) {
                    data.cell.styles.halign = 'left';
                }
            }
            if (data.section === 'body') {
                if (data.column.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                } else if (data.column.index === 6) {
                    data.cell.styles.fontStyle = 'bold';
                    const st = String(data.cell.raw).toUpperCase();
                    if (st.includes('BORRADOR')) {
                        data.cell.styles.fillColor = [239, 246, 255];
                        data.cell.styles.textColor = [37, 99, 235];
                    } else {
                        data.cell.styles.fillColor = [255, 247, 237];
                        data.cell.styles.textColor = [234, 88, 12];
                    }
                }
            }
        }
    });

    applyStandardFooter(doc, { pageWidth, pageHeight, marginX, title: 'Registros Pendientes de Creación' });
    const nowStamp = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Pendientes_Creacion_${nowStamp}.pdf`);
}

/**
 * 3. REPORTE: Registros Pendientes de Auditoría
 */
export async function generatePendientesAuditoriaPDF({ porAuditar = [], periodoLabel = 'Todos', filterEstado = 'todos', user = {} }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const marginX = 14;
    const printableWidth = pageWidth - (marginX * 2);

    const logoDataUrl = await getLogoDataUrl();

    drawStandardCorporateHeader(doc, {
        title: 'REGISTROS PENDIENTES DE AUDITORÍA',
        subtitle: 'Autoevaluaciones enviadas por contratistas listas para auditoría OVAL',
        user,
        logoDataUrl,
        pageWidth,
        marginX
    });

    drawStandardContextBox(doc, {
        itemsCount: porAuditar.length,
        periodoLabel,
        filterEstado,
        customLabel: 'Módulo Pendientes • Carpetas de cumplimiento remitidas para validación técnica',
        marginX,
        printableWidth
    });

    const tableHeaders = [[
        'ID',
        'EMPRESA CONTRATISTA (EECC)',
        'Nº CONTRATO / SERVICIO / DEPENDENCIA',
        'PERIODO EVALUADO',
        'PROGRAMA ASIGNADO',
        'CUMPLIMIENTO EECC',
        'ESTADO AUDITORÍA'
    ]];

    const tableData = porAuditar.map((reg) => {
        const vinc = reg.vinculacionEntidad || reg.asignacion || reg.vinculacion;
        const eecc = reg.eecc_nombre || vinc?.contratista?.nombre || 'N/A';
        const numContrato = vinc?.numero_contrato ? `Contrato N° ${vinc.numero_contrato}` : (vinc?.servicio?.nombre || 'Servicio');
        const servDep = `${vinc?.servicio?.nombre || 'N/A'} • ${vinc?.dependencia?.nombre || reg.dependencia || 'N/A'}`;
        const periodoStr = reg.periodo || '-';
        const progStr = reg.programa?.nombre || 'Estándar OIEM';
        const cumpStr = `${parseFloat(reg.porcentaje_cumplimiento || 0).toFixed(1)}%`;
        
        let estadoStr = 'AUDITABLE';
        if (reg.estado_auditoria === 'auditando') estadoStr = 'EN AUDITORÍA';
        else if (reg.estado_auditoria === 'reabierto') estadoStr = 'REABIERTO';
        else if (reg.estado_auditoria === 'abierto') estadoStr = 'ABIERTO';

        return [
            `#${reg.id}`,
            eecc,
            `${numContrato}\n${servDep}`,
            periodoStr,
            progStr,
            cumpStr,
            estadoStr
        ];
    });

    autoTable(doc, {
        startY: 36,
        head: tableHeaders,
        body: tableData,
        showHead: 'everyPage',
        margin: { left: marginX, right: marginX, top: 24, bottom: 14 },
        theme: 'grid',
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [71, 85, 105],
            fontSize: 6.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
            lineWidth: 0.2,
            lineColor: [226, 232, 240]
        },
        styles: {
            fontSize: 6.3,
            cellPadding: 2,
            valign: 'middle',
            overflow: 'linebreak',
            lineColor: [241, 245, 249],
            lineWidth: 0.2
        },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 65 },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 46 },
            5: { cellWidth: 26, halign: 'center' },
            6: { cellWidth: 30, halign: 'center' }
        },
        didParseCell: (data) => {
            if (data.section === 'head') {
                if (data.column.index === 1 || data.column.index === 2 || data.column.index === 4) {
                    data.cell.styles.halign = 'left';
                }
            }
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [100, 116, 139];
                } else if (data.column.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                } else if (data.column.index === 5) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 53, 148];
                } else if (data.column.index === 6) {
                    data.cell.styles.fontStyle = 'bold';
                    const st = String(data.cell.raw).toUpperCase();
                    if (st.includes('AUDITORÍA')) {
                        data.cell.styles.fillColor = [239, 246, 255];
                        data.cell.styles.textColor = [29, 78, 216];
                    } else if (st.includes('REABIERTO')) {
                        data.cell.styles.fillColor = [255, 247, 237];
                        data.cell.styles.textColor = [234, 88, 12];
                    } else {
                        data.cell.styles.fillColor = [254, 249, 195];
                        data.cell.styles.textColor = [133, 77, 14];
                    }
                }
            }
        }
    });

    applyStandardFooter(doc, { pageWidth, pageHeight, marginX, title: 'Registros Pendientes de Auditoría' });
    const nowStamp = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Pendientes_Auditoria_${nowStamp}.pdf`);
}

/**
 * 4. REPORTE: Pendientes de Revisión (Subsanados)
 */
export async function generatePendientesRevisionPDF({ porRevisar = [], periodoLabel = 'Todos', filterEstado = 'todos', user = {} }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const marginX = 14;
    const printableWidth = pageWidth - (marginX * 2);

    const logoDataUrl = await getLogoDataUrl();

    drawStandardCorporateHeader(doc, {
        title: 'PENDIENTES DE REVISIÓN (SUBSANADOS)',
        subtitle: 'Planes de acción y correcciones cargadas para verificación del auditor',
        user,
        logoDataUrl,
        pageWidth,
        marginX
    });

    drawStandardContextBox(doc, {
        itemsCount: porRevisar.length,
        periodoLabel,
        filterEstado,
        customLabel: 'Módulo Pendientes • Registros con subsanaciones listas para validación final',
        marginX,
        printableWidth
    });

    const tableHeaders = [[
        'ID',
        'EMPRESA CONTRATISTA (EECC)',
        'Nº CONTRATO / SERVICIO / DEPENDENCIA',
        'PERIODO EVALUADO',
        'PROGRAMA ASIGNADO',
        'AVANCE DECLARADO',
        'ESTADO REVISIÓN'
    ]];

    const tableData = porRevisar.map((reg) => {
        const vinc = reg.vinculacionEntidad || reg.asignacion || reg.vinculacion;
        const eecc = reg.eecc_nombre || vinc?.contratista?.nombre || 'N/A';
        const numContrato = vinc?.numero_contrato ? `Contrato N° ${vinc.numero_contrato}` : (vinc?.servicio?.nombre || 'Servicio');
        const servDep = `${vinc?.servicio?.nombre || 'N/A'} • ${vinc?.dependencia?.nombre || reg.dependencia || 'N/A'}`;
        const periodoStr = reg.periodo || '-';
        const progStr = reg.programa?.nombre || 'Estándar OIEM';
        const cumpStr = `${parseFloat(reg.porcentaje_cumplimiento || 0).toFixed(1)}%`;
        
        let estadoStr = 'PENDIENTE SUBSANACIÓN';
        if (reg.estado_auditoria === 'subsanado') estadoStr = 'SUBSANADO';
        else if (reg.estado_auditoria === 'en_revision') estadoStr = 'EN REVISIÓN';

        return [
            `#${reg.id}`,
            eecc,
            `${numContrato}\n${servDep}`,
            periodoStr,
            progStr,
            cumpStr,
            estadoStr
        ];
    });

    autoTable(doc, {
        startY: 36,
        head: tableHeaders,
        body: tableData,
        showHead: 'everyPage',
        margin: { left: marginX, right: marginX, top: 24, bottom: 14 },
        theme: 'grid',
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [71, 85, 105],
            fontSize: 6.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
            lineWidth: 0.2,
            lineColor: [226, 232, 240]
        },
        styles: {
            fontSize: 6.3,
            cellPadding: 2,
            valign: 'middle',
            overflow: 'linebreak',
            lineColor: [241, 245, 249],
            lineWidth: 0.2
        },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 65 },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 46 },
            5: { cellWidth: 26, halign: 'center' },
            6: { cellWidth: 30, halign: 'center' }
        },
        didParseCell: (data) => {
            if (data.section === 'head') {
                if (data.column.index === 1 || data.column.index === 2 || data.column.index === 4) {
                    data.cell.styles.halign = 'left';
                }
            }
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [100, 116, 139];
                } else if (data.column.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                } else if (data.column.index === 5) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [124, 58, 237]; // Purple
                } else if (data.column.index === 6) {
                    data.cell.styles.fontStyle = 'bold';
                    const st = String(data.cell.raw).toUpperCase();
                    if (st.includes('SUBSANADO')) {
                        data.cell.styles.fillColor = [245, 243, 255];
                        data.cell.styles.textColor = [124, 58, 237];
                    } else if (st.includes('REVISIÓN')) {
                        data.cell.styles.fillColor = [239, 246, 255];
                        data.cell.styles.textColor = [2, 132, 199];
                    } else {
                        data.cell.styles.fillColor = [255, 247, 237];
                        data.cell.styles.textColor = [234, 88, 12];
                    }
                }
            }
        }
    });

    applyStandardFooter(doc, { pageWidth, pageHeight, marginX, title: 'Pendientes de Revisión (Subsanados)' });
    const nowStamp = new Date().toISOString().slice(0, 10);
    doc.save(`Reporte_Pendientes_Revision_${nowStamp}.pdf`);
}
