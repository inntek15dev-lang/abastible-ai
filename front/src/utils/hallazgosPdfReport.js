// IEEE Trace: REQ-010 | US-010 | utils/hallazgosPdfReport.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

let cachedLogoDataUrl = null;

async function getLogoDataUrl() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || 200;
            canvas.height = img.naturalHeight || 50;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            cachedLogoDataUrl = canvas.toDataURL("image/png");
            resolve(cachedLogoDataUrl);
        };
        img.onerror = () => {
            const pngImg = new Image();
            pngImg.crossOrigin = "Anonymous";
            pngImg.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = pngImg.naturalWidth || 200;
                canvas.height = pngImg.naturalHeight || 50;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(pngImg, 0, 0);
                cachedLogoDataUrl = canvas.toDataURL("image/png");
                resolve(cachedLogoDataUrl);
            };
            pngImg.onerror = () => resolve(null);
            pngImg.src = "/logo.png";
        };
        img.src = "/logo.svg";
    });
}

/**
 * Genera y descarga el reporte PDF de Gestión de Hallazgos con diseño corporativo
 * de alta fidelidad, idéntico al reporte de Matriz de Cumplimiento.
 */
export async function generateHallazgosPDF({ hallazgos = [], filters = {}, options = {}, user = {}, kpis = {} }) {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
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
    doc.rect(0, 0, pageWidth, 2.5, "F");

    // Orange Accent Line
    doc.setFillColor(254, 80, 0); // #FE5000
    doc.rect(0, 2.5, pageWidth, 1.0, "F");

    // Header Background Area
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 3.5, pageWidth, 18, "F");

    // Logo
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", marginX, 5.5, 34, 7.82);
    }

    const titleX = logoDataUrl ? 54 : marginX;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 53, 148);
    doc.text("REPORTE OFICIAL DE GESTIÓN DE HALLAZGOS", titleX, 10.5);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("No conformidades, desviaciones y observaciones de auditoría operacional OIEM", titleX, 15.5);

    // Emisión info right aligned
    const nowStr = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha emisión: ${nowStr} ${timeStr}`, pageWidth - marginX, 10.5, { align: "right" });
    if (user?.name || user?.email) {
        doc.text(`Generado por: ${user.name || user.email}`, pageWidth - marginX, 15.5, { align: "right" });
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
    doc.roundedRect(marginX, metaY, printableWidth, metaHeight, 2, 2, "FD");

    // Labels for active filters
    let contratistaLabel = "Todas";
    if (filters.contratista_id && filters.contratista_id !== "todos") {
        const found = options.contratistas?.find(c => String(c.id) === String(filters.contratista_id));
        contratistaLabel = found ? (found.nombre || found.name) : `ID #${filters.contratista_id}`;
    }

    let servicioLabel = "Todos";
    if (filters.servicio_id && filters.servicio_id !== "todos") {
        const found = options.servicios?.find(s => String(s.id) === String(filters.servicio_id));
        servicioLabel = found ? (found.nombre || found.name) : `ID #${filters.servicio_id}`;
    }

    let depLabel = "Todas";
    if (filters.dependencia_id && filters.dependencia_id !== "todas") {
        const found = options.dependencias?.find(d => String(d.id) === String(filters.dependencia_id));
        depLabel = found ? (found.nombre || found.name) : `ID #${filters.dependencia_id}`;
    }

    let progLabel = "Todos";
    if (filters.programa_id && filters.programa_id !== "todos") {
        const found = options.programas?.find(p => String(p.id) === String(filters.programa_id));
        progLabel = found ? (found.nombre || found.name) : `ID #${filters.programa_id}`;
    }

    const estadoLabel = filters.estado && filters.estado !== "todos"
        ? filters.estado.replace(/_/g, " ").toUpperCase()
        : "Todos";

    const totalCount = hallazgos.length;
    const abiertosCount = kpis.abiertos !== undefined ? kpis.abiertos : hallazgos.filter(h => h.estado === "abierto").length;
    const enProcesoCount = kpis.enProceso !== undefined ? kpis.enProceso : hallazgos.filter(h => h.estado === "en_proceso").length;
    const cerradosCount = kpis.cerrados !== undefined ? kpis.cerrados : hallazgos.filter(h => h.estado === "cerrado").length;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);

    // Row 1: KPI Counters
    doc.text("TOTAL EVALUADOS:", marginX + 3, metaY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 53, 148);
    doc.text(`${totalCount} hallazgos`, marginX + 32, metaY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("ABIERTOS:", marginX + 68, metaY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(String(abiertosCount), marginX + 85, metaY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 119, 6);
    doc.text("EN PROCESO:", marginX + 105, metaY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(String(enProcesoCount), marginX + 126, metaY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("CERRADOS:", marginX + 146, metaY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(String(cerradosCount), marginX + 165, metaY + 4.5);

    if (kpis.tiempoPromedioDias !== undefined) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("PROM. MITIGACIÓN:", marginX + 185, metaY + 4.5);
        doc.setFont("helvetica", "normal");
        doc.text(`${kpis.tiempoPromedioDias} días`, marginX + 215, metaY + 4.5);
    }

    // Row 2: Active Filters
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("FILTROS ACTIVOS:", marginX + 3, metaY + 9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const filtersSummary = `Empresa: ${contratistaLabel}  |  Servicio: ${servicioLabel}  |  Planta: ${depLabel}  |  Programa: ${progLabel}  |  Estado: ${estadoLabel}`;
    doc.text(filtersSummary, marginX + 27, metaY + 9);

    // ==========================================
    // 3. TABLE DATA WITH AUTOTABLE
    // ==========================================
    const tableHeaders = [
        [
            "#",
            "PROGRAMA / ELEMENTO",
            "ACTIVIDAD EVALUADA",
            "CONTRATISTA / PLANTA",
            "TIPO",
            "ESTADO",
            "DESCRIPCIÓN / DETALLE HALLAZGO"
        ]
    ];

    const tableData = hallazgos.map((h, idx) => {
        const act = h.registroActividad?.actividad;
        const elem = act?.elemento;
        const prog = elem?.programa || h.registro?.programa;
        const vinc = h.registro?.vinculacionEntidad;

        const progText = prog?.nombre || "General";
        const elemText = elem ? `${elem.codigo || ""} ${elem.nombre || ""}`.trim() : "-";
        const actCod = act?.codigo || "-";
        const actNom = act?.nombre || "-";
        const contNom = vinc?.contratista?.nombre || h.registro?.eecc_nombre || "-";
        const depNom = vinc?.dependencia?.nombre || "-";
        const tipoText = (h.tipo || "").replace(/_/g, " ").toUpperCase();
        const estadoText = (h.estado || "").replace(/_/g, " ").toUpperCase();
        const descText = h.descripcion || "-";

        return [
            `#${h.id}`,
            `${progText}\n${elemText}`,
            `${actCod}\n${actNom}`,
            `${contNom}\n${depNom}`,
            tipoText,
            estadoText,
            descText
        ];
    });

    const columnStylesConfig = {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 46 },
        2: { cellWidth: 46 },
        3: { cellWidth: 42 },
        4: { cellWidth: 24, halign: "center" },
        5: { cellWidth: 22, halign: "center" },
        6: { cellWidth: 77 }
    };

    autoTable(doc, {
        startY: 36,
        head: tableHeaders,
        body: tableData,
        showHead: "everyPage",
        margin: { left: marginX, right: marginX, top: 24, bottom: 14 },
        theme: "grid",
        headStyles: {
            fillColor: [248, 250, 252], // #f8fafc
            textColor: [71, 85, 105],   // #475569
            fontSize: 6.5,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            cellPadding: 2,
            lineWidth: 0.2,
            lineColor: [226, 232, 240]
        },
        styles: {
            fontSize: 6.3,
            cellPadding: 2,
            valign: "middle",
            overflow: "linebreak",
            lineColor: [241, 245, 249],
            lineWidth: 0.2
        },
        columnStyles: columnStylesConfig,
        didParseCell: function (data) {
            if (data.section === "head") {
                if (data.column.index >= 1 && data.column.index <= 3) {
                    data.cell.styles.halign = "left";
                }
            }

            if (data.section === "body") {
                // Column 0: ID
                if (data.column.index === 0) {
                    data.cell.styles.textColor = [100, 116, 139];
                    data.cell.styles.fontStyle = "bold";
                }
                // Column 1: Programa / Elemento
                else if (data.column.index === 1) {
                    data.cell.styles.textColor = [0, 53, 148]; // #003594
                    data.cell.styles.fontStyle = "bold";
                }
                // Column 2: Actividad
                else if (data.column.index === 2) {
                    data.cell.styles.textColor = [15, 23, 42]; // #0f172a
                }
                // Column 3: Contratista / Planta
                else if (data.column.index === 3) {
                    data.cell.styles.textColor = [30, 41, 59]; // #1e293b
                }
                // Column 4: Tipo (Badge)
                else if (data.column.index === 4) {
                    data.cell.styles.fillColor = [241, 245, 249]; // #f1f5f9
                    data.cell.styles.textColor = [71, 85, 105];   // #475569
                    data.cell.styles.fontStyle = "bold";
                }
                // Column 5: Estado (Badge)
                else if (data.column.index === 5) {
                    const st = String(data.cell.raw).toLowerCase();
                    if (st.includes("cerrado")) {
                        data.cell.styles.fillColor = [240, 253, 244]; // #f0fdf4
                        data.cell.styles.textColor = [5, 150, 105];   // #059669
                    } else if (st.includes("proceso")) {
                        data.cell.styles.fillColor = [254, 252, 232]; // #fefce8
                        data.cell.styles.textColor = [217, 119, 6];   // #d97706
                    } else {
                        data.cell.styles.fillColor = [254, 242, 242]; // #fef2f2
                        data.cell.styles.textColor = [220, 38, 38];   // #dc2626
                    }
                    data.cell.styles.fontStyle = "bold";
                }
                // Column 6: Descripción
                else if (data.column.index === 6) {
                    data.cell.styles.textColor = [51, 65, 85];
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
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Abastible S.A. | Sistema de Gestión de Cumplimiento OIEM - Gestión de Hallazgos", marginX, pageHeight - 6);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: "right" });
    }

    // ==========================================
    // 5. SAVE PDF FILE
    // ==========================================
    const fileName = `Reporte_Oficial_Hallazgos_${nowStr.replace(/\//g, "-")}.pdf`;
    doc.save(fileName);
}
