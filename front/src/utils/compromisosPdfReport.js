// IEEE Trace: REQ-010 | US-010 | utils/compromisosPdfReport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to create Donut Chart image
function createPieChartImage(cumplidos, pendientes, enProceso, vencidos) {
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const total = cumplidos + pendientes + enProceso + vencidos;
    if (total === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin compromisos registrados', canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL('image/png');
    }

    const data = [
        { label: 'Cumplidos', count: cumplidos, color: '#10b981' },
        { label: 'En Proceso', count: enProceso, color: '#3b82f6' },
        { label: 'Pendientes', count: pendientes, color: '#f59e0b' },
        { label: 'Vencidos', count: vencidos, color: '#ef4444' }
    ].filter(d => d.count > 0);

    const centerX = 120;
    const centerY = 120;
    const radius = 80;
    const innerRadius = 45;

    let startAngle = -Math.PI / 2;

    data.forEach(slice => {
        const sliceAngle = (slice.count / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();

        startAngle = endAngle;
    });

    // Center % Text
    const closurePct = Math.round((cumplidos / total) * 100);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${closurePct}%`, centerX, centerY - 6);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Cierre', centerX, centerY + 12);

    // Legend
    let legendY = 35;
    data.forEach(slice => {
        const pct = Math.round((slice.count / total) * 100);

        ctx.fillStyle = slice.color;
        ctx.beginPath();
        ctx.arc(250, legendY + 6, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(slice.label, 265, legendY + 6);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(`${slice.count} (${pct}%)`, 365, legendY + 6);

        legendY += 34;
    });

    return canvas.toDataURL('image/png');
}

// Helper to create Responsibility Chart image
function createResponsabilidadChartImage(abastibleCount, contratistaCount) {
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const total = abastibleCount + contratistaCount;
    if (total === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos de responsabilidad', canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL('image/png');
    }

    const maxVal = Math.max(abastibleCount, contratistaCount, 1);
    const chartHeight = 130;
    const barWidth = 60;

    // Abastible Bar
    const absH = (abastibleCount / maxVal) * chartHeight;
    const absX = 110;
    const absY = 180 - absH;

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(absX, absY, barWidth, absH);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${abastibleCount}`, absX + barWidth / 2, absY - 8);
    ctx.fillText('Abastible', absX + barWidth / 2, 202);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${Math.round((abastibleCount / total) * 100)}%`, absX + barWidth / 2, 218);

    // Contratista Bar
    const conH = (contratistaCount / maxVal) * chartHeight;
    const conX = 260;
    const conY = 180 - conH;

    ctx.fillStyle = '#9333ea';
    ctx.fillRect(conX, conY, barWidth, conH);

    ctx.fillStyle = '#6b21a8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${contratistaCount}`, conX + barWidth / 2, conY - 8);
    ctx.fillText('Contratista', conX + barWidth / 2, 202);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${Math.round((contratistaCount / total) * 100)}%`, conX + barWidth / 2, 218);

    // Base Line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 180);
    ctx.lineTo(380, 180);
    ctx.stroke();

    return canvas.toDataURL('image/png');
}

// Helper to create Stacked Bar Chart image (Empresas vs Estados)
function createBarChartImage(empresasData) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!empresasData || empresasData.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos de empresas contratistas', canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL('image/png');
    }

    const maxVal = Math.max(...empresasData.map(e => e.total), 1);
    const barHeight = 22;
    const gap = 12;
    const startY = 25;
    const labelWidth = 220;
    const chartWidth = 600;

    empresasData.slice(0, 5).forEach((item, idx) => {
        const y = startY + idx * (barHeight + gap);

        // Label
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const empName = item.nombre.length > 32 ? item.nombre.substring(0, 30) + '..' : item.nombre;
        ctx.fillText(empName, labelWidth - 12, y + barHeight / 2);

        // Stacked Bar
        let currentX = labelWidth;
        const totalBarWidth = (item.total / maxVal) * chartWidth;

        const cumplidoW = (item.cumplidos / item.total) * totalBarWidth;
        const pendienteW = ((item.pendientes + item.enProceso) / item.total) * totalBarWidth;
        const vencidoW = (item.vencidos / item.total) * totalBarWidth;

        if (cumplidoW > 0) {
            ctx.fillStyle = '#10b981';
            ctx.fillRect(currentX, y, cumplidoW, barHeight);
            currentX += cumplidoW;
        }
        if (pendienteW > 0) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(currentX, y, pendienteW, barHeight);
            currentX += pendienteW;
        }
        if (vencidoW > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(currentX, y, vencidoW, barHeight);
            currentX += vencidoW;
        }

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.total}`, currentX + 8, y + barHeight / 2);
    });

    // Legend
    const legendY = 215;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(labelWidth, legendY, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Cumplidos', labelWidth + 18, legendY + 10);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(labelWidth + 140, legendY, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.fillText('Pendientes / En Proceso', labelWidth + 158, legendY + 10);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(labelWidth + 330, legendY, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.fillText('Vencidos', labelWidth + 348, legendY + 10);

    return canvas.toDataURL('image/png');
}

export function generateExecutiveCompromisosPDF({ compromisos, user, filtersInfo, isVencidoFn }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;

    // Helper for Footer on every page
    const addFooter = (currentPage, totalPages) => {
        doc.setPage(currentPage);
        doc.setLineWidth(0.3);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('DOCUMENTO CONFIDENCIAL - USO INTERNO ABASTIBLE S.A.', 14, pageHeight - 6);
        doc.text(`Página ${currentPage} de ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    };

    // ==========================================
    // PAGE 1: PORTADA Y DASHBOARD EJECUTIVO
    // ==========================================

    // Header Banner
    doc.setFillColor(0, 53, 148); // Abastible Blue
    doc.rect(0, 0, pageWidth, 24, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ABASTIBLE - INFORME EJECUTIVO DE COMPROMISOS', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control Operacional e Inspecciones (OIEM)', 14, 18);

    // Right Metadata Box in Banner
    doc.setFontSize(8.5);
    doc.text(`Generado por: ${user?.name || 'Usuario'} (${user?.role || 'Auditor'})`, pageWidth - 14, 10, { align: 'right' });
    doc.text(`Emisión: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 16, { align: 'right' });

    // Active Filters Line
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 24, pageWidth, 9, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    const filterText = `Filtros: ${filtersInfo || 'Todos los registros y compromisos'}`;
    doc.text(filterText.length > 150 ? filterText.substring(0, 147) + '...' : filterText, 14, 30);

    // Calculate Metrics
    const totalCount = compromisos.length;
    const cumplidosCount = compromisos.filter(c => c.estado === 'cumplido').length;
    const vencidosCount = compromisos.filter(c => isVencidoFn(c.fecha_compromiso, c.estado)).length;
    const pendientesCount = compromisos.filter(c => ['pendiente', 'en_proceso'].includes(c.estado) && !isVencidoFn(c.fecha_compromiso, c.estado)).length;
    const cierrePct = totalCount > 0 ? Math.round((cumplidosCount / totalCount) * 100) : 0;

    const abastibleCount = compromisos.filter(c => (c.responsabilidad || '').toLowerCase() === 'abastible').length;
    const contratistaCount = totalCount - abastibleCount;

    // Draw KPI Cards Row
    const kpiY = 37;
    const kpiHeight = 22;
    const kpiWidth = 51;
    const kpiGap = 4;
    let kpiX = 14;

    const kpis = [
        { label: 'TOTAL COMPROMISOS', value: `${totalCount}`, sub: 'Compromisos cargados', color: [0, 53, 148], accent: [2, 132, 199] },
        { label: 'CUMPLIDOS', value: `${cumplidosCount}`, sub: `${totalCount > 0 ? Math.round((cumplidosCount / totalCount) * 100) : 0}% cerrados`, color: [6, 95, 70], accent: [16, 185, 129] },
        { label: 'PENDIENTES / PROCESO', value: `${pendientesCount}`, sub: 'Acciones abiertas a tiempo', color: [180, 83, 9], accent: [245, 158, 11] },
        { label: 'VENCIDOS', value: `${vencidosCount}`, sub: `${totalCount > 0 ? Math.round((vencidosCount / totalCount) * 100) : 0}% fuera de plazo`, color: [153, 27, 27], accent: [239, 68, 68] },
        { label: '% CIERRE GLOBAL', value: `${cierrePct}%`, sub: 'Meta esperada: 100%', color: [6, 95, 70], accent: [16, 185, 129] }
    ];

    kpis.forEach(kpi => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, 2.5, 2.5, 'FD');

        // Top Accent Line
        doc.setFillColor(...kpi.accent);
        doc.rect(kpiX, kpiY, kpiWidth, 2, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, kpiX + 4, kpiY + 7);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...kpi.color);
        doc.text(kpi.value, kpiX + 4, kpiY + 15);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(kpi.sub, kpiX + 4, kpiY + 19.5);

        kpiX += kpiWidth + kpiGap;
    });

    // ==========================================
    // CHARTS SECTION (2 Canvas Columns + Bottom Row)
    // ==========================================
    const chartY = 64;

    // Box 1: Estado Donut Chart (Left)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, chartY, 132, 70, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Distribución por Estado del Compromiso', 20, chartY + 7);

    const pieImg = createPieChartImage(cumplidosCount, pendientesCount, 0, vencidosCount);
    doc.addImage(pieImg, 'PNG', 16, chartY + 10, 128, 56);

    // Box 2: Responsabilidad Chart (Right)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(151, chartY, 132, 70, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Marca de Responsabilidad (Abastible vs Contratista)', 157, chartY + 7);

    const respImg = createResponsabilidadChartImage(abastibleCount, contratistaCount);
    doc.addImage(respImg, 'PNG', 153, chartY + 10, 128, 56);

    // Box 3: Empresas Contratistas Breakdown (Bottom Chart Row)
    const empChartY = 138;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, empChartY, 269, 60, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Comparativa de Compromisos por Empresa Contratista (Top 5)', 20, empChartY + 7);

    // Group Compromisos by Empresa
    const empMap = {};
    compromisos.forEach(c => {
        const name = c.registro?.eecc_nombre || 'Sin Empresa Contratista';
        if (!empMap[name]) empMap[name] = { nombre: name, total: 0, cumplidos: 0, pendientes: 0, enProceso: 0, vencidos: 0 };
        empMap[name].total += 1;
        if (c.estado === 'cumplido') empMap[name].cumplidos += 1;
        else if (isVencidoFn(c.fecha_compromiso, c.estado)) empMap[name].vencidos += 1;
        else empMap[name].pendientes += 1;
    });

    const empresasData = Object.values(empMap).sort((a, b) => b.total - a.total);
    const barImg = createBarChartImage(empresasData);
    doc.addImage(barImg, 'PNG', 16, empChartY + 10, 265, 48);

    // ==========================================
    // PAGE 2+: COMPENDIO DETALLADO DE COMPROMISOS
    // ==========================================
    doc.addPage('a4', 'landscape');

    // Page 2 Header Banner
    doc.setFillColor(0, 53, 148);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPENDIO DETALLADO DE COMPROMISOS', 14, 11);

    const tableHeaders = [
        ['ID', 'Empresa / Servicio / Contrato', 'Descripción de la Acción Correctiva', 'Marca Resp.', 'F. Compromiso', 'Estado', 'Registrado Por', 'Responsable Cierre']
    ];

    const tableData = compromisos.map(c => [
        `#${c.id}`,
        `${c.registro?.eecc_nombre || 'N/A'}\n${c.registro?.servicio_nombre || ''}${c.registro?.vinculacionEntidad?.numero_contrato ? `\nContrato: ${c.registro.vinculacionEntidad.numero_contrato}` : ''}`,
        c.descripcion || 'Sin descripción',
        (c.responsabilidad || 'contratista').toUpperCase(),
        c.fecha_compromiso ? new Date(c.fecha_compromiso).toLocaleDateString('es-CL') : 'N/A',
        isVencidoFn(c.fecha_compromiso, c.estado) ? 'VENCIDO' : c.estado.toUpperCase().replace('_', ' '),
        c.creadoPor?.name || c.responsable?.name || 'N/A',
        c.responsableCierre?.name || (c.estado === 'cumplido' ? 'Administrador' : '-')
    ]);

    autoTable(doc, {
        startY: 20,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [0, 53, 148],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 3
        },
        styles: {
            fontSize: 8,
            cellPadding: 2.5,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 14, fontStyle: 'bold' },
            1: { cellWidth: 48 },
            2: { cellWidth: 82 },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 24, halign: 'center' },
            5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
            6: { cellWidth: 26 },
            7: { cellWidth: 24 }
        },
        didParseCell: function (data) {
            // Style Estado Column
            if (data.section === 'body' && data.column.index === 5) {
                const val = data.cell.raw;
                if (val === 'CUMPLIDO') {
                    data.cell.styles.textColor = [16, 185, 129];
                } else if (val === 'VENCIDO') {
                    data.cell.styles.textColor = [239, 68, 68];
                } else if (val === 'EN PROCESO') {
                    data.cell.styles.textColor = [59, 130, 246];
                } else {
                    data.cell.styles.textColor = [245, 158, 11];
                }
            }
            // Style Responsabilidad Column
            if (data.section === 'body' && data.column.index === 3) {
                const val = data.cell.raw;
                if (val === 'ABASTIBLE') {
                    data.cell.styles.textColor = [3, 105, 161];
                } else {
                    data.cell.styles.textColor = [107, 33, 168];
                }
            }
        }
    });

    // Add footers on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        addFooter(i, totalPages);
    }

    doc.save(`Reporte_Ejecutivo_Compromisos_${new Date().toISOString().split('T')[0]}.pdf`);
}
