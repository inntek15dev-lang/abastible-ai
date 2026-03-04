/**
 * generate_templates.js
 * Generates properly designed XLSX evidence template files with actual content
 * based on the template sheets found in the original Excel planillas.
 * 
 * Each template type gets a properly structured XLSX with:
 * - Headers, section titles
 * - Form fields with merged cells
 * - Styled borders, fills, fonts
 * - Proper column widths
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'storage', 'templates_evidencia');
const PLANILLAS = path.resolve(__dirname, '..', '..', 'info', 'medias', 'planillas');

// ═══════════════════════════════════════════════════════════════
// STYLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
const BRAND_BLUE = '003594';
const BRAND_ORANGE = 'FF6600';
const GRAY_HEADER = 'F3F4F6';
const WHITE = 'FFFFFF';
const LIGHT_BLUE = 'E8F0FE';
const LIGHT_ORANGE = 'FFF7ED';

const styles = {
    title: { font: { bold: true, size: 14, color: { argb: WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } },
    subtitle: { font: { bold: true, size: 11, color: { argb: BRAND_BLUE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } },
    sectionHeader: { font: { bold: true, size: 10, color: { argb: WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ORANGE } }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } },
    label: { font: { bold: true, size: 9, color: { argb: '374151' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY_HEADER } }, alignment: { vertical: 'middle', wrapText: true } },
    value: { font: { size: 9, color: { argb: '6B7280' } }, alignment: { vertical: 'middle', wrapText: true } },
    tableHeader: { font: { bold: true, size: 9, color: { argb: WHITE } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } },
    tableCell: { font: { size: 9 }, alignment: { vertical: 'middle', wrapText: true } },
    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
};

function applyStyle(cell, style) {
    if (style.font) cell.font = style.font;
    if (style.fill) cell.fill = style.fill;
    if (style.alignment) cell.alignment = style.alignment;
    cell.border = styles.border;
}

function mergeTitled(ws, row, startCol, endCol, text, style) {
    ws.mergeCells(row, startCol, row, endCol);
    const cell = ws.getCell(row, startCol);
    cell.value = text;
    applyStyle(cell, style);
}

function labelValue(ws, row, labelCol, labelText, valueCol, valueCols) {
    const lc = ws.getCell(row, labelCol);
    lc.value = labelText;
    applyStyle(lc, styles.label);
    if (valueCols > 1) ws.mergeCells(row, valueCol, row, valueCol + valueCols - 1);
    const vc = ws.getCell(row, valueCol);
    vc.value = '';
    applyStyle(vc, styles.value);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE GENERATORS
// ═══════════════════════════════════════════════════════════════

async function generateRegistroSeguridad() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registro +Seguridad');
    ws.columns = [{ width: 5 }, { width: 30 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }];

    // Title
    mergeTitled(ws, 1, 1, 19, 'PROGRAMA DE GESTIÓN OIEM CONTRATISTAS\nSEGURIDAD CONTRATISTA', styles.title);
    ws.getRow(1).height = 40;

    // Company info
    let r = 3;
    labelValue(ws, r, 1, 'Nombre EECC', 3, 4);
    labelValue(ws, r, 8, 'Repositorio Documental', 10, 10); r++;
    labelValue(ws, r, 1, 'Dependencia', 3, 4);
    labelValue(ws, r, 8, 'TEAMS - EVIDENCIA DE ACTIVIDADES', 10, 10); r++;
    labelValue(ws, r, 1, 'Mes Informado', 3, 4); r++;
    labelValue(ws, r, 1, 'N° personas nuevas', 3, 4); r++;

    // Header row
    r = 8;
    mergeTitled(ws, r, 1, 1, 'Ítem', styles.tableHeader);
    mergeTitled(ws, r, 2, 2, 'Actividades de Programa', styles.tableHeader);
    mergeTitled(ws, r, 3, 3, 'Descripción y criterios', styles.tableHeader);
    mergeTitled(ws, r, 4, 4, 'Responsable', styles.tableHeader);
    mergeTitled(ws, r, 5, 5, 'Frecuencia', styles.tableHeader);
    mergeTitled(ws, r, 6, 6, 'Evidencia', styles.tableHeader);
    mergeTitled(ws, r, 7, 7, 'Cumplimiento', styles.tableHeader);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    months.forEach((m, i) => { mergeTitled(ws, r, 8 + i, 8 + i, m, styles.tableHeader); });

    // Activity rows
    const elements = [
        {
            code: '1', name: 'ELEMENTO 1: Liderazgo y compromiso', activities: [
                { code: '1.1', name: 'Ejecución del Programa SAFEALIGN', freq: 'Mensual' },
                { code: '1.2', name: 'Participación en CPHS de faena', freq: 'Mensual' },
                { code: '1.3', name: 'Reunión de accountability', freq: 'Mensual' }
            ]
        },
        {
            code: '2', name: 'ELEMENTO 2: Evaluación del riesgo', activities: [
                { code: '2.1', name: 'Análisis de riesgos cualitativo (AST)', freq: 'Mensual' }
            ]
        },
        {
            code: '3', name: 'ELEMENTO 5: Competencias y capacitación', activities: [
                { code: '3.1', name: 'Ejecución de inducciones', freq: 'Mensual' },
                { code: '3.2', name: 'Cumplimiento plan capacitación anual', freq: 'Mensual' }
            ]
        },
        {
            code: '4', name: 'ELEMENTO 6-7: Operaciones e Integridad Mecánica', activities: [
                { code: '4.1', name: 'Aplicación lista verificación OBS/INSP/MMC', freq: 'Mensual' },
                { code: '4.2', name: 'Gestión de cierre de tarjetas', freq: 'Mensual' }
            ]
        },
        {
            code: '5', name: 'ELEMENTO 9: Servicios de terceros', activities: [
                { code: '5.1', name: 'Acreditación EECC y trabajadores', freq: 'Mensual' },
                { code: '5.2', name: 'Verificación laboral', freq: 'Mensual' },
                { code: '5.3', name: 'Reunión accountability mensual', freq: 'Mensual' }
            ]
        },
        {
            code: '6', name: 'ELEMENTO 10: Investigación de accidentes', activities: [
                { code: '6.1', name: 'Envío informe investigación en plazo', freq: 'Según ocurrencia' },
                { code: '6.2', name: 'Verificación cierre acciones correctivas', freq: 'Según ocurrencia' }
            ]
        },
        {
            code: '7', name: 'ELEMENTO 12: Evaluación y mejora', activities: [
                { code: '7.1', name: 'N° incidentes no registrables', freq: 'Mensual' },
                { code: '7.2', name: 'N° incidentes registrables', freq: 'Mensual' }
            ]
        }
    ];

    r = 9;
    for (const el of elements) {
        mergeTitled(ws, r, 1, 1, el.code, styles.sectionHeader);
        mergeTitled(ws, r, 2, 19, el.name, styles.sectionHeader);
        r++;
        for (const act of el.activities) {
            const row = ws.getRow(r);
            [act.code, act.name, '', '', act.freq, '', ''].forEach((v, i) => {
                const c = row.getCell(i + 1);
                c.value = v;
                applyStyle(c, styles.tableCell);
            });
            months.forEach((_, i) => {
                const c = row.getCell(8 + i);
                c.value = '';
                applyStyle(c, styles.tableCell);
            });
            r++;
        }
    }

    // Total row
    mergeTitled(ws, r, 1, 3, 'TOTAL MENSUAL', styles.subtitle);
    months.forEach((_, i) => { const c = ws.getCell(r, 8 + i); c.value = ''; applyStyle(c, styles.label); });

    const filename = 'template_evidencia_registro_seguridad.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateRegistroAsistencia() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Registro de Asistencia');
    ws.columns = [{ width: 5 }, { width: 15 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }];

    mergeTitled(ws, 1, 1, 6, 'REGISTRO DE ASISTENCIA', styles.title);
    ws.getRow(1).height = 35;

    let r = 3;
    labelValue(ws, r, 1, 'Empresa', 2, 2);
    labelValue(ws, r, 4, 'Fecha', 5, 2); r++;
    labelValue(ws, r, 1, 'Dependencia', 2, 2);
    labelValue(ws, r, 4, 'Actividad', 5, 2); r++;
    labelValue(ws, r, 1, 'Expositor', 2, 2);
    labelValue(ws, r, 4, 'Hora inicio', 5, 1);
    labelValue(ws, r + 1, 4, 'Hora término', 5, 1); r++;
    r++;

    // Topic
    mergeTitled(ws, r, 1, 6, 'TEMA TRATADO', styles.sectionHeader); r++;
    mergeTitled(ws, r, 1, 6, '', styles.value); ws.getRow(r).height = 50; r++;

    // Attendees table
    mergeTitled(ws, r, 1, 6, 'ASISTENTES', styles.sectionHeader); r++;
    ['N°', 'Nombre', 'RUT', 'Cargo', 'Firma', 'Observación'].forEach((h, i) => {
        mergeTitled(ws, r, i + 1, i + 1, h, styles.tableHeader);
    });
    r++;
    for (let i = 1; i <= 20; i++) {
        const row = ws.getRow(r);
        [String(i), '', '', '', '', ''].forEach((v, ci) => {
            const c = row.getCell(ci + 1);
            c.value = v;
            applyStyle(c, styles.tableCell);
        });
        r++;
    }

    // Signature section
    r++;
    mergeTitled(ws, r, 1, 3, 'Firma Expositor', styles.label);
    mergeTitled(ws, r, 4, 6, 'Firma Supervisor / Jefatura', styles.label);

    const filename = 'template_evidencia_registro_asistencia.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateAST() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Análisis Seguro de Trabajo');
    ws.columns = [{ width: 5 }, { width: 30 }, { width: 30 }, { width: 25 }, { width: 25 }];

    mergeTitled(ws, 1, 1, 5, 'ANÁLISIS SEGURO DE TRABAJO (AST)', styles.title);
    ws.getRow(1).height = 35;

    // Section 1: Identification
    let r = 3;
    mergeTitled(ws, r, 1, 5, 'IDENTIFICACIÓN DEL ÁREA DE TRABAJO', styles.sectionHeader); r++;
    labelValue(ws, r, 1, 'Empresa', 2, 2); labelValue(ws, r, 4, 'Fecha', 5, 1); r++;
    labelValue(ws, r, 1, 'Supervisor', 2, 2); labelValue(ws, r, 4, 'N° Permiso Trabajo', 5, 1); r++;
    labelValue(ws, r, 1, 'Centro de Trabajo', 2, 1); labelValue(ws, r, 3, 'Área o ubicación', 4, 2); r++;
    ws.mergeCells(r, 1, r, 1); ws.getCell(r, 1).value = 'Tarea que se realizará'; applyStyle(ws.getCell(r, 1), styles.label);
    ws.mergeCells(r, 2, r, 5); ws.getCell(r, 2).value = ''; applyStyle(ws.getCell(r, 2), styles.value); r++;

    // Section 2: Work planning
    r++;
    mergeTitled(ws, r, 1, 5, 'SECCIÓN 1: PLANIFICACIÓN DEL TRABAJO', styles.sectionHeader); r++;
    mergeTitled(ws, r, 1, 5, 'A continuación, debe planificar paso a paso el trabajo que se realizará y las respectivas medidas de control.', styles.subtitle); r++;

    // Table headers
    mergeTitled(ws, r, 1, 1, 'N°', styles.tableHeader);
    mergeTitled(ws, r, 2, 2, 'Etapa del trabajo', styles.tableHeader);
    mergeTitled(ws, r, 3, 3, 'Riesgo de seguridad / Aspecto ambiental', styles.tableHeader);
    mergeTitled(ws, r, 4, 5, 'Control', styles.tableHeader); r++;

    for (let i = 1; i <= 10; i++) {
        [String(i), '', '', ''].forEach((v, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value = v;
            applyStyle(c, styles.tableCell);
        });
        ws.mergeCells(r, 4, r, 5);
        ws.getRow(r).height = 25;
        r++;
    }

    // Section 3: Risk identification
    r++;
    mergeTitled(ws, r, 1, 5, 'SECCIÓN 2: IDENTIFICACIÓN DE RIESGOS DE SEGURIDAD Y ASPECTOS AMBIENTALES', styles.sectionHeader); r++;
    mergeTitled(ws, r, 1, 5, '¿Qué PELIGROS / RIESGOS puedo afrontar?', styles.subtitle); r++;

    const risks = [
        'Caída de personas', 'Caída de objetos', 'Golpes y cortes', 'Atrapamiento',
        'Exposición a sustancias', 'Contacto eléctrico', 'Incendio / Explosión',
        'Proyección de partículas', 'Sobreesfuerzo', 'Exposición a ruido',
        'Trabajo en altura', 'Espacio confinado'
    ];
    risks.forEach((risk) => {
        const c1 = ws.getCell(r, 1); c1.value = '☐'; applyStyle(c1, styles.tableCell);
        ws.mergeCells(r, 2, r, 5);
        const c2 = ws.getCell(r, 2); c2.value = risk; applyStyle(c2, styles.tableCell);
        r++;
    });

    // Signatures
    r++;
    mergeTitled(ws, r, 1, 2, 'Firma Supervisor', styles.label);
    mergeTitled(ws, r, 3, 5, 'Firma Trabajadores', styles.label);

    const filename = 'template_evidencia_ast.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateResumenEstadistico() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Resumen Estadístico');
    ws.columns = [{ width: 4 }, { width: 25 }, { width: 20 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 10 }];

    mergeTitled(ws, 1, 1, 16, 'RESUMEN ESTADÍSTICO MENSUAL', styles.title);
    ws.getRow(1).height = 35;

    let r = 3;
    // Company info
    labelValue(ws, r, 1, 'Nombre EECC', 3, 3); labelValue(ws, r, 7, 'N° Supervisores EECC', 9, 2); r++;
    labelValue(ws, r, 1, 'Dependencia', 3, 3); labelValue(ws, r, 7, 'N° EPR EECC', 9, 2); r++;
    labelValue(ws, r, 1, 'Mes informado', 3, 3); labelValue(ws, r, 7, 'Dotación Total', 9, 2); r++;
    labelValue(ws, r, 1, 'N° personas nuevas', 3, 3); r++;

    // Performance section
    r++;
    mergeTitled(ws, r, 1, 16, 'DESEMPEÑO', styles.sectionHeader); r++;

    // Training summary header
    mergeTitled(ws, r, 1, 9, 'Resumen de Capacitaciones', styles.subtitle);
    mergeTitled(ws, r, 10, 11, 'IMC', styles.subtitle);
    mergeTitled(ws, r, 12, 13, '% Resolución Tarjetas', styles.subtitle);
    mergeTitled(ws, r, 14, 15, 'Asistencia CPHS', styles.subtitle);
    mergeTitled(ws, r, 16, 16, 'Cumpl. TOTAL', styles.subtitle); r++;

    ['Tema tratado', '', '', '', 'N° Personas', '', 'HH Capacitación', '', '', '', '', '', '', '', '', ''].forEach((v, i) => {
        const c = ws.getCell(r, i + 1); c.value = v; applyStyle(c, styles.label);
    }); r++;

    for (let i = 0; i < 4; i++) {
        for (let c = 1; c <= 16; c++) { applyStyle(ws.getCell(r, c), styles.tableCell); }
        r++;
    }

    // Modules performance table
    r++;
    mergeTitled(ws, r, 1, 3, 'MÓDULOS', styles.tableHeader);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'TOTAL'];
    months.forEach((m, i) => mergeTitled(ws, r, 4 + i, 4 + i, m, styles.tableHeader)); r++;

    const modulos = [
        'ELEMENTO 1: Liderazgo y compromiso',
        'ELEMENTO 2: Evaluación del riesgo',
        'ELEMENTO 5: Competencias y capacitación',
        'ELEMENTO 6-7: Operaciones / Integridad Mecánica',
        'ELEMENTO 9: Servicios de terceros',
        'ELEMENTO 10: Investigación de accidentes',
        'ELEMENTO 12: Evaluación y mejora'
    ];
    modulos.forEach(mod => {
        ws.mergeCells(r, 1, r, 3);
        const c = ws.getCell(r, 1); c.value = mod; applyStyle(c, styles.label);
        for (let i = 4; i <= 16; i++) applyStyle(ws.getCell(r, i), styles.tableCell);
        r++;
    });
    ws.mergeCells(r, 1, r, 3);
    const tc = ws.getCell(r, 1); tc.value = 'TOTAL MENSUAL'; applyStyle(tc, styles.subtitle);
    for (let i = 4; i <= 16; i++) applyStyle(ws.getCell(r, i), styles.label);
    r++;

    // Results section
    r++;
    mergeTitled(ws, r, 1, 16, 'RESULTADOS', styles.sectionHeader); r++;
    r++;
    const accHeaders = ['', '', 'Mes', 'Num. Acc.', 'Acc. Acum.', 'Días Perdidos', 'D.P. Acum.', 'HH Trabajadas', 'Nro Trab.', 'Prom. Trab.', 'Accid.', 'Siniestralidad', 'Frec.', 'Grav.'];
    accHeaders.forEach((h, i) => {
        if (i >= 2) mergeTitled(ws, r, i + 1, i + 1, h, styles.tableHeader);
    }); r++;
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    meses.forEach(mes => {
        ws.getCell(r, 3).value = mes; applyStyle(ws.getCell(r, 3), styles.tableCell);
        for (let i = 4; i <= 14; i++) applyStyle(ws.getCell(r, i), styles.tableCell);
        r++;
    });

    // Accident details table
    r++;
    mergeTitled(ws, r, 1, 14, 'DETALLE DE ACCIDENTES', styles.sectionHeader); r++;
    ['Nombre Accidentado', '', '', '', '', 'Fecha Acc.', 'Hora Acc.', 'Fecha Mutualidad', 'Fecha Alta', 'N° Días Mes', 'N° Días Acum.', 'Informe Inv.'].forEach((h, i) => {
        const c = ws.getCell(r, i + 1); c.value = h; applyStyle(c, styles.tableHeader);
    }); r++;
    for (let i = 0; i < 5; i++) {
        for (let c = 1; c <= 14; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    const filename = 'template_evidencia_resumen_estadistico.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateCheckListCamion(variant) {
    const isEnvasado = variant === 'envasado';
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Check List Camión ${isEnvasado ? 'Envasado' : 'Granel'}`);
    ws.columns = Array.from({ length: 20 }, () => ({ width: 8 }));
    ws.getColumn(1).width = 4;
    ws.getColumn(2).width = 40;

    const titleText = isEnvasado
        ? 'CHECK LIST CAMIONES TRANSPORTE CILINDROS'
        : 'CHECK LIST CAMIONES TRANSPORTE GRANEL';

    mergeTitled(ws, 1, 1, 20, titleText, styles.title);
    ws.getRow(1).height = 35;
    mergeTitled(ws, 2, 1, 8, 'Gerencia Operaciones', styles.subtitle);
    mergeTitled(ws, 2, 9, 20, `Fecha actualización: ${new Date().toLocaleDateString('es-CL')}`, styles.subtitle);

    let r = 4;
    labelValue(ws, r, 1, 'Dependencia', 2, 8); r++;
    labelValue(ws, r, 1, 'Fecha', 2, 4); labelValue(ws, r, 7, 'Hora', 8, 3); r++;
    labelValue(ws, r, 1, 'Chofer', 2, 8); r++;
    labelValue(ws, r, 1, 'Contratista', 2, 8); r++;

    r++;
    // Section I: Autocontrol
    mergeTitled(ws, r, 1, 3, 'I', styles.sectionHeader);
    mergeTitled(ws, r, 4, 20, 'AUTOCONTROL PRIMARIO INICIO JORNADA (Responsable: Tripulación)', styles.sectionHeader); r++;

    const sections = [
        {
            title: 'a) DOCUMENTACIÓN', items: [
                '01. ¿Revisión técnica vigente?', '02. ¿Licencia de conducir?',
                '03. ¿Permiso de circulación vigente?', '04. ¿Seguro obligatorio?',
                '05. ¿Registro SEC?', '06. ¿Nómina de personal autorizado actualizada?',
                '07. ¿Hoja de datos de seguridad?'
            ]
        },
        {
            title: 'b) ELEMENTOS DE SEGURIDAD', items: [
                '08. ¿Extintor vigente y operativo?', '09. ¿Botiquín completo?',
                '10. ¿Triángulos reflectantes?', '11. ¿Chaleco reflectante?',
                '12. ¿Kit antiderrame?', '13. ¿Cuñas para ruedas?'
            ]
        },
        {
            title: 'c) CARROCERÍA', items: [
                '14. ¿Piso de la carrocería en buen estado?',
                '15. ¿Escalones/pisaderas completos y en buen estado?',
                '16. ¿Planchas metálicas móviles en buen estado?',
                '17. ¿Carrocería, bisagras y estructura en buen estado?',
                '18. ¿Puertas en buen estado Art. 112 DS 108?',
                '19. ¿Tensores superiores en buen estado?',
                '20. ¿Neumáticos en buen estado?'
            ]
        },
        {
            title: 'd) EQUIPOS DE PROTECCIÓN', items: [
                '21. ¿Casco de seguridad?', '22. ¿Guantes de seguridad?',
                '23. ¿Zapatos de seguridad?', '24. ¿Lentes de seguridad?',
                '25. ¿Protección auditiva?'
            ]
        },
        {
            title: 'e) MARCAS Y ETIQUETAS', items: [
                '26. Rombos "GAS LICUADO INFLAMABLE - 2" (1 por cada lado)',
                '27. Número UN "1075" (1 por cada lado)',
                '28. Leyenda parabrisas "GAS LICUADO INFLAMABLE" Art. 74 DS 108'
            ]
        }
    ];

    for (const section of sections) {
        mergeTitled(ws, r, 1, 15, section.title, styles.subtitle);
        mergeTitled(ws, r, 16, 17, 'SI', styles.tableHeader);
        mergeTitled(ws, r, 18, 19, 'NO', styles.tableHeader);
        mergeTitled(ws, r, 20, 20, 'N/A', styles.tableHeader); r++;

        for (const item of section.items) {
            ws.mergeCells(r, 1, r, 15);
            const c = ws.getCell(r, 1); c.value = item; applyStyle(c, styles.tableCell);
            ws.mergeCells(r, 16, r, 17); applyStyle(ws.getCell(r, 16), styles.tableCell);
            ws.mergeCells(r, 18, r, 19); applyStyle(ws.getCell(r, 18), styles.tableCell);
            applyStyle(ws.getCell(r, 20), styles.tableCell);
            r++;
        }
    }

    // Section II: Authorization
    r++;
    mergeTitled(ws, r, 1, 3, 'II', styles.sectionHeader);
    mergeTitled(ws, r, 4, 20, 'CONTROL AUTORIZACIÓN SALIDA (Responsable: Tripulación)', styles.sectionHeader); r++;

    const exitItems = [
        '¿Las puertas están aseguradas con pestillos cerrados y con candados?',
        '¿Las puertas traseras son utilizadas como elementos de contención?',
        '¿Se observan cilindros acostados, derrumbados o sueltos?',
        '¿Se asegura la carga mediante eslingas en buen estado?',
        '¿Las eslingas están correctamente afianzadas a la carrocería?'
    ];

    mergeTitled(ws, r, 1, 15, '', styles.subtitle);
    mergeTitled(ws, r, 16, 17, 'SI', styles.tableHeader);
    mergeTitled(ws, r, 18, 19, 'NO', styles.tableHeader);
    mergeTitled(ws, r, 20, 20, 'N/A', styles.tableHeader); r++;

    exitItems.forEach((item, i) => {
        ws.mergeCells(r, 1, r, 15);
        const c = ws.getCell(r, 1); c.value = `${29 + i}. ${item}`; applyStyle(c, styles.tableCell);
        ws.mergeCells(r, 16, r, 17); applyStyle(ws.getCell(r, 16), styles.tableCell);
        ws.mergeCells(r, 18, r, 19); applyStyle(ws.getCell(r, 18), styles.tableCell);
        applyStyle(ws.getCell(r, 20), styles.tableCell);
        r++;
    });

    // Observations
    r++;
    mergeTitled(ws, r, 1, 20, 'OBSERVACIONES', styles.sectionHeader); r++;
    mergeTitled(ws, r, 1, 20, '', styles.value); ws.getRow(r).height = 60; r++;

    // Signatures
    r++;
    mergeTitled(ws, r, 1, 10, 'Firma Conductor', styles.label);
    mergeTitled(ws, r, 11, 20, 'Firma Supervisor / Despachador', styles.label);

    const suffix = isEnvasado ? 'envasado' : 'granel';
    const filename = `template_evidencia_check_camion_${suffix}.xlsx`;
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateMMCEPP() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Verificación MMC-EPP');
    ws.columns = [{ width: 5 }, { width: 35 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }];

    mergeTitled(ws, 1, 1, 6, 'VERIFICACIÓN MANEJO MANUAL DE CARGAS / USO EPP', styles.title);
    ws.getRow(1).height = 35;

    let r = 3;
    labelValue(ws, r, 1, 'Empresa', 2, 2); labelValue(ws, r, 4, 'Fecha', 5, 2); r++;
    labelValue(ws, r, 1, 'Dependencia', 2, 2); labelValue(ws, r, 4, 'Inspector', 5, 2); r++;

    // MMC Section
    r++;
    mergeTitled(ws, r, 1, 6, 'SECCIÓN 1: MANEJO MANUAL DE CARGAS (MMC)', styles.sectionHeader); r++;
    ['N°', 'Aspecto a Verificar', 'Cumple', 'No Cumple', 'N/A', 'Observación'].forEach((h, i) => {
        mergeTitled(ws, r, i + 1, i + 1, h, styles.tableHeader);
    }); r++;

    const mmcItems = [
        'Peso de carga ≤ 25 kg (hombres) / 20 kg (mujeres)',
        'Técnica de levantamiento correcta (piernas, espalda recta)',
        'Uso de ayudas mecánicas cuando corresponde',
        'Frecuencia de manipulación dentro de lo permitido',
        'Almacenamiento de cargas a altura adecuada',
        'Señalización de pesos en cargas',
        'Capacitación vigente en MMC'
    ];
    mmcItems.forEach((item, i) => {
        [String(i + 1), item, '', '', '', ''].forEach((v, ci) => {
            const c = ws.getCell(r, ci + 1); c.value = v; applyStyle(c, styles.tableCell);
        }); r++;
    });

    // EPP Section
    r++;
    mergeTitled(ws, r, 1, 6, 'SECCIÓN 2: EQUIPOS DE PROTECCIÓN PERSONAL (EPP)', styles.sectionHeader); r++;
    ['N°', 'Elemento de Protección', 'Cumple', 'No Cumple', 'N/A', 'Observación'].forEach((h, i) => {
        mergeTitled(ws, r, i + 1, i + 1, h, styles.tableHeader);
    }); r++;

    const eppItems = [
        'Casco de seguridad', 'Lentes de seguridad', 'Zapatos de seguridad',
        'Guantes de trabajo', 'Ropa de algodón (no sintética)',
        'Chaleco reflectante', 'Protección auditiva', 'Protección respiratoria'
    ];
    eppItems.forEach((item, i) => {
        [String(i + 1), item, '', '', '', ''].forEach((v, ci) => {
            const c = ws.getCell(r, ci + 1); c.value = v; applyStyle(c, styles.tableCell);
        }); r++;
    });

    // Signatures
    r++;
    mergeTitled(ws, r, 1, 3, 'Firma Inspector', styles.label);
    mergeTitled(ws, r, 4, 6, 'Firma Trabajador', styles.label);

    const filename = 'template_evidencia_mmc_epp.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateSeguimientoMinsal() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Seguimiento Protocolos MINSAL');
    ws.columns = Array.from({ length: 20 }, () => ({ width: 10 }));
    ws.getColumn(1).width = 20;
    ws.getColumn(2).width = 20;
    ws.getColumn(3).width = 20;

    mergeTitled(ws, 1, 1, 20, 'SEGUIMIENTO Y CONTROL DE PROTOCOLOS MINSAL\nHERRAMIENTA DE APOYO PARA EMPRESAS CONTRATISTAS', styles.title);
    ws.getRow(1).height = 40;

    let r = 3;
    labelValue(ws, r, 1, 'Empresa', 2, 5); labelValue(ws, r, 8, 'RUT', 9, 4); r++;
    labelValue(ws, r, 1, 'Nombre Contrato', 2, 5); labelValue(ws, r, 8, 'Mes Informado', 9, 4); r++;

    // MMC Protocol
    r++;
    mergeTitled(ws, r, 1, 20, 'PROTOCOLO MANEJO MANUAL DE CARGAS (MMC)', styles.sectionHeader); r++;
    mergeTitled(ws, r, 1, 1, 'EMPRESA', styles.tableHeader);
    mergeTitled(ws, r, 2, 2, 'RESPONSABLE', styles.tableHeader);
    mergeTitled(ws, r, 3, 3, 'EXPERTO EPR', styles.tableHeader);

    const quarters = ['Q1 (MAR)', 'Q2 (ABR-MAY-JUN)', 'Q3 (JUL-AGO-SEPT)', 'Q4 (OCT-NOV-DIC)'];
    let colStart = 4;
    quarters.forEach(q => {
        const span = q.includes('Q1') ? 5 : 5;
        ws.mergeCells(r, colStart, r, colStart + span - 1);
        const c = ws.getCell(r, colStart); c.value = q; applyStyle(c, styles.tableHeader);
        colStart += span;
    }); r++;
    for (let i = 0; i < 3; i++) {
        for (let c = 1; c <= 20; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    // TMERT Protocol
    r++;
    mergeTitled(ws, r, 1, 20, 'PROTOCOLO TRASTORNOS MUSCULOESQUELÉTICOS (TMERT)', styles.sectionHeader); r++;
    for (let i = 0; i < 3; i++) {
        for (let c = 1; c <= 20; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    // RUVS Protocol
    r++;
    mergeTitled(ws, r, 1, 20, 'PROTOCOLO RADIACIÓN ULTRAVIOLETA SOLAR (RUVS)', styles.sectionHeader); r++;
    for (let i = 0; i < 3; i++) {
        for (let c = 1; c <= 20; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    // PREXOR Protocol
    r++;
    mergeTitled(ws, r, 1, 20, 'PROTOCOLO EXPOSICIÓN OCUPACIONAL A RUIDO (PREXOR)', styles.sectionHeader); r++;
    for (let i = 0; i < 3; i++) {
        for (let c = 1; c <= 20; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    // Riesgo Psicosocial
    r++;
    mergeTitled(ws, r, 1, 20, 'PROTOCOLO DE RIESGO PSICOSOCIAL', styles.sectionHeader); r++;
    for (let i = 0; i < 3; i++) {
        for (let c = 1; c <= 20; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    const filename = 'template_evidencia_seguimiento_minsal.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

async function generateInformeInvestigacion() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Informe Investigación');
    ws.columns = Array.from({ length: 14 }, () => ({ width: 10 }));
    ws.getColumn(2).width = 18;
    ws.getColumn(3).width = 14;

    mergeTitled(ws, 1, 1, 14, 'FORMULARIO\nINFORME SIMPLIFICADO DE INVESTIGACIÓN', styles.title);
    ws.getRow(1).height = 40;
    mergeTitled(ws, 2, 1, 11, '', styles.subtitle);
    mergeTitled(ws, 2, 12, 12, 'Versión', styles.label);
    mergeTitled(ws, 2, 13, 14, '1', styles.value);

    let r = 4;
    mergeTitled(ws, r, 1, 14, '1.- ANTECEDENTES GENERALES', styles.sectionHeader); r++;
    labelValue(ws, r, 1, 'Tipo incidente', 2, 1);
    ws.getCell(r, 4).value = 'Personas'; applyStyle(ws.getCell(r, 4), styles.label);
    ws.getCell(r, 6).value = 'Material'; applyStyle(ws.getCell(r, 6), styles.label);
    ws.getCell(r, 8).value = 'Ambiente'; applyStyle(ws.getCell(r, 8), styles.label);
    ws.getCell(r, 10).value = 'Procesos'; applyStyle(ws.getCell(r, 10), styles.label);
    ws.getCell(r, 12).value = 'Vial'; applyStyle(ws.getCell(r, 12), styles.label);
    r++;

    const fields1 = ['Lugar del incidente', 'Lugar específico', 'Proceso donde ocurre',
        'Fecha del incidente', 'Hora del incidente', 'Dueño del proceso',
        'Área responsable', 'Gerencia responsable'];
    fields1.forEach(f => { labelValue(ws, r, 1, f, 3, 12); r++; });

    // Person data
    r++;
    mergeTitled(ws, r, 1, 14, '2.- ANTECEDENTES DE LA PERSONA LESIONADA', styles.sectionHeader); r++;
    ['Nombre lesionado', 'Cargo que desempeña', 'Antigüedad en empresa',
        'Edad', 'Actividad desarrollada', 'Tipo de Lesión'].forEach(f => {
            labelValue(ws, r, 1, f, 4, 11); r++;
        });

    // Description
    r++;
    mergeTitled(ws, r, 1, 14, '3.- DESCRIPCIÓN DEL INCIDENTE (¿Qué? ¿Quién? ¿Cómo? ¿Cuándo? ¿Dónde?)', styles.sectionHeader); r++;
    ws.mergeCells(r, 1, r + 5, 14);
    ws.getCell(r, 1).value = ''; applyStyle(ws.getCell(r, 1), styles.value);
    r += 6;

    // Losses
    r++;
    mergeTitled(ws, r, 1, 14, '4.- PÉRDIDAS IDENTIFICADAS', styles.sectionHeader); r++;
    ws.mergeCells(r, 1, r + 2, 14);
    ws.getCell(r, 1).value = ''; applyStyle(ws.getCell(r, 1), styles.value);
    r += 3;

    // Immediate actions
    r++;
    mergeTitled(ws, r, 1, 14, '5.- ACCIONES INMEDIATAS', styles.sectionHeader); r++;
    ws.mergeCells(r, 1, r + 2, 14);
    ws.getCell(r, 1).value = ''; applyStyle(ws.getCell(r, 1), styles.value);
    r += 3;

    // Photos
    r++;
    mergeTitled(ws, r, 1, 14, '6.- FOTOGRAFÍAS', styles.sectionHeader); r++;
    ws.mergeCells(r, 1, r + 3, 14);
    ws.getCell(r, 1).value = '(Adjuntar fotografías del lugar, equipo y/o lesión)'; applyStyle(ws.getCell(r, 1), styles.value);
    r += 4;

    // Action plan
    r++;
    mergeTitled(ws, r, 1, 14, '7.- PLAN DE ACCIÓN / ACCIONES CORRECTIVAS', styles.sectionHeader); r++;
    ['N°', 'Acción correctiva/preventiva', '', '', '', '', '', '', '', '', 'Responsable', '', 'Plazo', ''].forEach((h, i) => {
        const c = ws.getCell(r, i + 1); c.value = h; applyStyle(c, styles.tableHeader);
    }); r++;
    for (let i = 1; i <= 5; i++) {
        ws.getCell(r, 1).value = `ACCIÓN ${i}`; applyStyle(ws.getCell(r, 1), styles.tableCell);
        for (let c = 2; c <= 14; c++) applyStyle(ws.getCell(r, c), styles.tableCell);
        r++;
    }

    const filename = 'template_evidencia_informe_investigacion.xlsx';
    await wb.xlsx.writeFile(path.join(OUTPUT_DIR, filename));
    return filename;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('🔧 Generating designed evidence templates...\n');

    const templates = [];

    const f1 = await generateRegistroSeguridad();
    console.log(`  ✅ ${f1}`); templates.push(f1);

    const f2 = await generateRegistroAsistencia();
    console.log(`  ✅ ${f2}`); templates.push(f2);

    const f3 = await generateAST();
    console.log(`  ✅ ${f3}`); templates.push(f3);

    const f4 = await generateResumenEstadistico();
    console.log(`  ✅ ${f4}`); templates.push(f4);

    const f5 = await generateCheckListCamion('envasado');
    console.log(`  ✅ ${f5}`); templates.push(f5);

    const f6 = await generateCheckListCamion('granel');
    console.log(`  ✅ ${f6}`); templates.push(f6);

    const f7 = await generateMMCEPP();
    console.log(`  ✅ ${f7}`); templates.push(f7);

    const f8 = await generateSeguimientoMinsal();
    console.log(`  ✅ ${f8}`); templates.push(f8);

    const f9 = await generateInformeInvestigacion();
    console.log(`  ✅ ${f9}`); templates.push(f9);

    console.log(`\n✅ Generated ${templates.length} designed template files in ${OUTPUT_DIR}`);

    // Now update evidence_map.json to use the new template filenames
    // Map evidence references from Excel → template files
    const evidToTemplate = {
        'registro +seguridad': 'template_evidencia_registro_seguridad.xlsx',
        'registro  seguridad': 'template_evidencia_registro_seguridad.xlsx',
        'registro_seguridad': 'template_evidencia_registro_seguridad.xlsx',
        'registro de asistencia': 'template_evidencia_registro_asistencia.xlsx',
        'registro de asistencia, junto con acta respectiva.': 'template_evidencia_registro_asistencia.xlsx',
        'análisis de riesgos (ast)': 'template_evidencia_ast.xlsx',
        'análisis de riesgos (ast) eleborado para dofusión y registro de asistencia.': 'template_evidencia_ast.xlsx',
        'an\u00e1lisis de riesgos (ast) eleborado para dofusi\u00f3n y registro de asistencia.': 'template_evidencia_ast.xlsx',
        'resumen estadístico': 'template_evidencia_resumen_estadistico.xlsx',
        'resumen estad\u00edstico': 'template_evidencia_resumen_estadistico.xlsx',
        'check list obs insp mmc': 'template_evidencia_mmc_epp.xlsx',
        'check list de salida camión envasado': 'template_evidencia_check_camion_envasado.xlsx',
        'check list de salida cami\u00f3n envasado': 'template_evidencia_check_camion_envasado.xlsx',
        'check list ejecutados en plataforma correspondiente.': 'template_evidencia_check_camion_granel.xlsx',
        'revisión aleatoria del lista de chequeo en sistema': 'template_evidencia_check_camion_granel.xlsx',
        'revisi\u00f3n aleatoria del lista de chequeo en sistema': 'template_evidencia_check_camion_granel.xlsx',
        'seguimiento protocolos minsal': 'template_evidencia_seguimiento_minsal.xlsx',
    };

    // Load existing evidence_map.json and update template references
    const mapPath = path.resolve(__dirname, '..', 'src', 'data', 'evidence_map.json');
    if (fs.existsSync(mapPath)) {
        const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
        let updated = 0;
        for (const entry of map) {
            if (entry.templateFile) {
                // Try to match by the evidence name
                const evName = (entry.evidenceName || '').toLowerCase().trim();
                for (const [key, tmpl] of Object.entries(evidToTemplate)) {
                    if (evName.includes(key) || key.includes(evName)) {
                        entry.templateFile = tmpl;
                        updated++;
                        break;
                    }
                }
            }
        }
        fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
        console.log(`\n📝 Updated ${updated} entries in evidence_map.json`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
