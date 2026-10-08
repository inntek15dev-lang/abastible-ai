// IEEE Trace: REQ-010 | US-010 | utils/matrixPdfReport.js
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
 * Genera y descarga el reporte PDF de Matriz de Cumplimiento con alta fidelidad visual idéntica a la UI.
 * Muestra TODOS los contratos sin paginación y todas las columnas dinámicas de periodos seleccionadas.
 */
export async function generateComplianceMatrixPDF({ columns = [], rows = [], filters = {}, options = {}, user = {} }) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const marginX = 14;
    const printableWidth = pageWidth - (marginX * 2); // 269mm

    const logoDataUrl = await getLogoDataUrl();

    // ==========================================
    // 1. HEADER BANNER (Abastible Corporate Brand)
    // ==========================================
    // Top Blue Bar
    doc.setFillColor(0, 53, 148); // #003594
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    // Orange Accent Line
    doc.setFillColor(254, 80, 0); // #FE5000
    doc.rect(0, 2.5, pageWidth, 1.0, 'F');

    // Header Background Area
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 3.5, pageWidth, 18, 'F');

    // Logo
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', marginX, 5.5, 34, 7.82);
    }

    const titleX = logoDataUrl ? 54 : marginX;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 53, 148);
    doc.text('MATRIZ DE CUMPLIMIENTO OIEM', titleX, 10.5);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Visión consolidada por vinculación: servicios con programa asignado', titleX, 15.5);

    // Emisión info right aligned
    const nowStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha emisión: ${nowStr} ${timeStr}`, pageWidth - marginX, 10.5, { align: 'right' });
    if (user?.name || user?.email) {
        doc.text(`Generado por: ${user.name || user.email}`, pageWidth - marginX, 15.5, { align: 'right' });
    }

    // Divider line below header
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, 20.5, pageWidth - marginX, 20.5);

    // ==========================================
    // 2. FILTERS & METADATA CHIPS BOX
    // ==========================================
    const metaY = 22.5;
    const metaHeight = 11;
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, metaY, printableWidth, metaHeight, 2, 2, 'FD');

    // Build filter text elements
    let contratistaLabel = 'Todas las empresas';
    if (filters.contratista_id && filters.contratista_id !== 'todos') {
        const found = options.contratistas?.find(c => String(c.id) === String(filters.contratista_id));
        contratistaLabel = found ? (found.nombre || found.name) : `ID #${filters.contratista_id}`;
    }

    let servicioLabel = 'Todos';
    if (filters.servicio_id && filters.servicio_id !== 'todos') {
        const found = options.servicios?.find(s => String(s.id) === String(filters.servicio_id));
        servicioLabel = found ? (found.nombre || found.name) : `ID #${filters.servicio_id}`;
    }

    let depLabel = 'Todas';
    if (filters.dependencia_id && filters.dependencia_id !== 'todas') {
        const found = options.dependencias?.find(d => String(d.id) === String(filters.dependencia_id));
        depLabel = found ? (found.nombre || found.name) : `ID #${filters.dependencia_id}`;
    }

    const periodoRangeStr = (filters.periodo_desde && filters.periodo_hasta)
        ? `${filters.periodo_desde} a ${filters.periodo_hasta} (${columns.length} periodos)`
        : `${columns.length} periodos evaluados`;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    // Column 1: Ventana de Evaluación
    doc.text('VENTANA EVALUADA:', marginX + 3, metaY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 53, 148);
    doc.text(periodoRangeStr, marginX + 34, metaY + 4.5);

    // Column 2: Total Contratos
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TOTAL CONTRATOS:', marginX + 105, metaY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${rows.length} vinculaciones encontradas`, marginX + 135, metaY + 4.5);

    // Line 2: Scope Filters
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('FILTROS ACTIVOS:', marginX + 3, metaY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const filtersSummary = `Empresa: ${contratistaLabel}  |  Servicio: ${servicioLabel}  |  Dependencia: ${depLabel}`;
    doc.text(filtersSummary, marginX + 27, metaY + 9);

    // ==========================================
    // 3. TABLE DATA WITH AUTOTABLE
    // ==========================================
    const tableHeaders = [
        [
            '#',
            'CONTRATISTA / RUT',
            'PROGRAMA / SERVICIO',
            'DEPENDENCIA',
            ...columns.map(c => `${c.label}
DECL. | AUDIT.`)
        ]
    ];

    const tableData = rows.map((r, idx) => {
        const rowCells = [
            `${idx + 1}`,
            `${r.contratista || 'N/A'}
${r.rut || '-'}`,
            `${r.programa || 'Sin Programa'}
${r.servicio || '-'}`,
            r.dependencia || '-'
        ];

        columns.forEach(col => {
            const cell = r.data?.[col.key];
            if (cell) {
                const dec = cell.declarado !== undefined && cell.declarado !== null ? `${cell.declarado}%` : '-';
                const aud = (cell.auditado !== null && cell.auditado !== undefined) ? ` | ${cell.auditado}%` : '';
                const est = (cell.estado || '').replace(/_/g, ' ').toUpperCase();
                rowCells.push(`${dec}${aud}
${est}`);
            } else {
                rowCells.push('-');
            }
        });

        return rowCells;
    });

    // Calculate dynamic column widths
    const baseWidth0 = 8;   // #
    const baseWidth1 = 46;  // Contratista / RUT
    const baseWidth2 = 46;  // Programa / Servicio
    const baseWidth3 = 27;  // Dependencia
    const fixedWidthTotal = baseWidth0 + baseWidth1 + baseWidth2 + baseWidth3; // 127mm

    const remainingWidth = printableWidth - fixedWidthTotal; // 142mm
    const numPeriodCols = Math.max(1, columns.length);
    const monthColWidth = Math.max(15, remainingWidth / numPeriodCols);

    const columnStylesConfig = {
        0: { cellWidth: baseWidth0, halign: 'center' },
        1: { cellWidth: baseWidth1 },
        2: { cellWidth: baseWidth2 },
        3: { cellWidth: baseWidth3, halign: 'center' }
    };

    columns.forEach((_, idx) => {
        columnStylesConfig[4 + idx] = {
            cellWidth: monthColWidth,
            halign: 'center'
        };
    });

    autoTable(doc, {
        startY: 36,
        head: tableHeaders,
        body: tableData,
        showHead: 'everyPage',
        margin: { left: marginX, right: marginX, top: 24, bottom: 14 },
        theme: 'grid',
        headStyles: {
            fillColor: [248, 250, 252], // #f8fafc
            textColor: [71, 85, 105],   // #475569
            fontSize: numPeriodCols > 8 ? 6.5 : 7.2,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
            lineWidth: 0.2,
            lineColor: [226, 232, 240]
        },
        styles: {
            fontSize: numPeriodCols > 8 ? 6.0 : 6.8,
            cellPadding: 2,
            valign: 'middle',
            overflow: 'linebreak',
            lineColor: [241, 245, 249],
            lineWidth: 0.2
        },
        columnStyles: columnStylesConfig,
        didParseCell: function (data) {
            // Header alignment for base text columns
            if (data.section === 'head') {
                if (data.column.index === 1 || data.column.index === 2) {
                    data.cell.styles.halign = 'left';
                }
            }

            if (data.section === 'body') {
                // Column 0: Index
                if (data.column.index === 0) {
                    data.cell.styles.textColor = [148, 163, 184];
                }
                // Column 1: Contratista / RUT
                else if (data.column.index === 1) {
                    data.cell.styles.textColor = [15, 23, 42]; // #0f172a
                    data.cell.styles.fontStyle = 'bold';
                }
                // Column 2: Programa / Servicio
                else if (data.column.index === 2) {
                    data.cell.styles.textColor = [0, 53, 148]; // #003594
                    data.cell.styles.fontStyle = 'bold';
                }
                // Column 3: Dependencia (Badge style)
                else if (data.column.index === 3) {
                    data.cell.styles.fillColor = [241, 245, 249]; // #f1f5f9
                    data.cell.styles.textColor = [71, 85, 105];   // #475569
                    data.cell.styles.halign = 'center';
                }
                // Period columns (index >= 4)
                else if (data.column.index >= 4) {
                    const colIdx = data.column.index - 4;
                    const colKey = columns[colIdx]?.key;
                    const originalRow = rows[data.row.index];
                    const cell = originalRow?.data?.[colKey];

                    data.cell.styles.halign = 'center';

                    if (cell) {
                        const val = parseFloat(cell.declarado);
                        // Cell Background Matching UI getCellBg
                        if (val >= 85) {
                            data.cell.styles.fillColor = [240, 253, 244]; // #f0fdf4
                            data.cell.styles.textColor = [5, 150, 105];   // #059669
                        } else if (val >= 70) {
                            data.cell.styles.fillColor = [254, 252, 232]; // #fefce8
                            data.cell.styles.textColor = [217, 119, 6];   // #d97706
                        } else {
                            data.cell.styles.fillColor = [254, 242, 242]; // #fef2f2
                            data.cell.styles.textColor = [220, 38, 38];   // #dc2626
                        }
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [203, 213, 225]; // #cbd5e1
                    }
                }
            }
        }
    });

    // ==========================================
    // 4. FOOTER ON EVERY PAGE
    // ==========================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Abastible S.A. | Sistema de Gestión de Cumplimiento OIEM - Matriz Ejecutiva', marginX, pageHeight - 6);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
    }

    // ==========================================
    // 5. SAVE PDF FILE
    // ==========================================
    const fileName = `Matriz_Cumplimiento_${filters.periodo_desde || 'inicio'}_a_${filters.periodo_hasta || 'fin'}.pdf`;
    doc.save(fileName);
}
