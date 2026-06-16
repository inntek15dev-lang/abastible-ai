/**
 * extract_templates.js
 * ---
 * Reads 4 Excel program files, extracts the "+Seguridad" sheet to build
 * activity→evidence mapping, then exports each referenced template sheet
 * as a standalone XLSX file into back/storage/.
 *
 * Usage: node scripts/extract_templates.js
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PLANILLAS = path.resolve(ROOT, '..', 'info', 'medias', 'planillas');
const STORAGE = path.resolve(ROOT, 'storage');

// Program metadata – order and index must match seed.js programas array
const PROGRAMS = [
    {
        index: 0, // programas[0]
        nombre: 'OIM Distribución Envasado',
        segSheet: '+Seguridad Contratista DI EN',
        dataFile: 'envasado',
        glob: '*Distribución Envasado.xlsx'  // Not Acotado
    },
    {
        index: 1,
        nombre: 'OIM Distribución Granel',
        segSheet: '+Seguridad Contratista DI GR',
        dataFile: 'granel',
        glob: '*Distribución Granel.xlsx'
    },
    {
        index: 2,
        nombre: 'OIM Distribución Envasado Acotado',
        segSheet: '+Seguridad Contratista DI EN',
        dataFile: 'envasado_acotado',
        glob: '*Envasado-Acotado.xlsx'
    },
    {
        index: 3,
        nombre: 'Programa OIEM Produccion Movilizado',
        segSheet: '+Seguridad Contra. PR Movilizad',
        dataFile: 'produccion_movilizado',
        glob: '*Producción Movilizado.xlsx'
    }
];

function sanitize(str) {
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function getCellText(cell) {
    if (!cell || !cell.value) return '';
    if (typeof cell.value === 'object') {
        if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('');
        if (cell.value.text !== undefined) return cell.value.text;
        if (cell.value.result !== undefined) return String(cell.value.result);
        return '';
    }
    return String(cell.value);
}

function findFile(globPattern) {
    const allFiles = fs.readdirSync(PLANILLAS);
    // Match by checking if the filename includes key parts
    const parts = globPattern.replace(/\*/g, '').trim();
    const match = allFiles.find(f => {
        // Normalize for comparison
        const normalized = f.normalize('NFC');
        const partsNorm = parts.normalize('NFC');
        return f.endsWith('.xlsx') && normalized.includes(partsNorm);
    });
    // Fallback: try simpler match
    if (!match) {
        const simpleKey = parts.replace(/[^a-zA-Z]/g, '').toLowerCase();
        return allFiles.find(f => {
            const fKey = f.replace(/[^a-zA-Z]/g, '').toLowerCase();
            return f.endsWith('.xlsx') && fKey.includes(simpleKey);
        });
    }
    return match;
}

async function extractProgram(program) {
    const filename = findFile(program.glob);
    if (!filename) {
        console.error(`  ❌ No file found for: ${program.glob}`);
        return [];
    }

    const filePath = path.join(PLANILLAS, filename);
    console.log(`\n📂 ${program.nombre}`);
    console.log(`   File: ${filename}`);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    // Find +Seguridad sheet
    let segWs = wb.worksheets.find(ws => ws.name === program.segSheet);
    if (!segWs) {
        // Try partial match
        segWs = wb.worksheets.find(ws => ws.name.includes('Seguridad'));
    }
    if (!segWs) {
        console.error(`  ❌ No +Seguridad sheet found`);
        return [];
    }
    console.log(`   +Seguridad sheet: "${segWs.name}"`);

    // Load the activity data file to know the expected codes
    const dataModule = require(path.join(ROOT, 'src', 'data', program.dataFile));

    // Collect all activity codes from data
    const allCodes = [];
    for (const elem of dataModule) {
        for (const act of elem.actividades) {
            allCodes.push({ codigo: act.codigo, elementoNumero: elem.numero, criterios: act.criterios });
        }
    }

    // Find header row in +Seguridad sheet (look for "Evidencia" in col 6)
    let headerRow = null;
    for (let r = 1; r <= Math.min(segWs.rowCount, 15); r++) {
        const row = segWs.getRow(r);
        for (let c = 1; c <= 10; c++) {
            const val = getCellText(row.getCell(c)).toLowerCase().trim();
            if (val === 'evidencia') {
                headerRow = r;
                break;
            }
        }
        if (headerRow) break;
    }

    if (!headerRow) {
        console.log(`   ⚠ No header row with "Evidencia" found, using row 12`);
        headerRow = 12; // Typical position
    }

    // Parse evidence mapping from +Seguridad sheet
    // Columns: C1=Ítem, C2=Actividad, C3=Descripción, C4=Responsable, C5=Frecuencia, C6=Evidencia, C7=Cumplimiento
    const evidenceMap = [];
    for (let r = headerRow + 1; r <= segWs.rowCount; r++) {
        const row = segWs.getRow(r);
        const codigo = getCellText(row.getCell(1)).trim();
        const evidencia = getCellText(row.getCell(6)).trim();

        if (!codigo || !evidencia) continue;
        // Skip element header rows (integer numbers like "1", "2")
        if (/^\d+$/.test(codigo)) continue;

        evidenceMap.push({ codigo, evidencia });
    }

    console.log(`   Found ${evidenceMap.length} evidence mappings`);

    // Match activities from data file with evidence from +Seguridad
    const results = [];
    for (const actData of allCodes) {
        // Find matching evidence
        const match = evidenceMap.find(e => e.codigo === actData.codigo);
        let evidenceName = match ? match.evidencia : actData.criterios;

        // Normalize evidence name - remove trailing punctuation, extra descriptions
        evidenceName = evidenceName.replace(/,\s*junto.*$/i, '').replace(/\.\s*$/, '').trim();

        // Try to find matching sheet in workbook
        let templateSheet = wb.worksheets.find(ws => {
            const wsName = ws.name.toLowerCase().trim();
            const evName = evidenceName.toLowerCase().trim();
            return wsName === evName || wsName.includes(evName) || evName.includes(wsName);
        });

        // Specific mapping fallbacks
        if (!templateSheet) {
            const lowerEvid = evidenceName.toLowerCase();
            if (lowerEvid.includes('registro +seguridad') || lowerEvid.includes('+seguridad')) {
                templateSheet = wb.worksheets.find(ws => ws.name.includes('Registro +Seguridad'));
            } else if (lowerEvid.includes('registro de asistencia') || lowerEvid.includes('registro asistencia')) {
                templateSheet = wb.worksheets.find(ws => ws.name.includes('Registro de Asistencia'));
            } else if (lowerEvid.includes('ast') || lowerEvid.includes('análisis de riesgos')) {
                templateSheet = wb.worksheets.find(ws => ws.name === 'AST');
            } else if (lowerEvid.includes('resumen estad')) {
                templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('resumen estad'));
            } else if (lowerEvid.includes('check list') || lowerEvid.includes('check') || lowerEvid.includes('lista de chequeo')) {
                // Check for program-specific check sheet
                templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('check'));
                if (!templateSheet) {
                    templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('mmc') || ws.name.toLowerCase().includes('epp'));
                }
            } else if (lowerEvid.includes('informe') && lowerEvid.includes('preliminar')) {
                templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('informe preliminar'));
            } else if (lowerEvid.includes('informe simplificado')) {
                templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('informe simplificado'));
            } else if (lowerEvid.includes('formato de declaración') || lowerEvid.includes('declaración')) {
                templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('declaraci'));
            } else if (lowerEvid.includes('protocolo') || lowerEvid.includes('minsal')) {
                templateSheet = wb.worksheets.find(ws => ws.name.toLowerCase().includes('protocolo'));
            }
        }

        results.push({
            programIndex: program.index,
            programNombre: program.nombre,
            codigo: actData.codigo,
            elementoNumero: actData.elementoNumero,
            evidenceName: evidenceName,
            sheetName: templateSheet ? templateSheet.name : null,
            hasTemplate: !!templateSheet
        });
    }

    // Export unique template sheets as individual XLSX files
    const exportedSheets = new Set();
    for (const result of results) {
        if (!result.sheetName || exportedSheets.has(result.sheetName)) continue;
        exportedSheets.add(result.sheetName);

        const sourceSheet = wb.worksheets.find(ws => ws.name === result.sheetName);
        if (!sourceSheet) continue;

        // Create new workbook with just this sheet
        const newWb = new ExcelJS.Workbook();
        const newWs = newWb.addWorksheet(result.sheetName);

        // Copy rows
        sourceSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            const newRow = newWs.getRow(rowNumber);
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);
                newCell.value = cell.value;
                if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
            });
            newRow.height = row.height;
            newRow.commit();
        });

        // Copy column widths
        sourceSheet.columns.forEach((col, idx) => {
            if (col.width) {
                newWs.getColumn(idx + 1).width = col.width;
            }
        });

        // Copy merged cells
        if (sourceSheet.model.merges) {
            sourceSheet.model.merges.forEach(merge => {
                try { newWs.mergeCells(merge); } catch (e) { /* ignore merge conflicts */ }
            });
        }

        // Save file
        const safeName = sanitize(result.sheetName);
        const fileName = `template_evidencia_${safeName}.xlsx`;

        // Save to a shared templates directory
        const templateDir = path.join(STORAGE, 'templates_evidencia');
        if (!fs.existsSync(templateDir)) {
            fs.mkdirSync(templateDir, { recursive: true });
        }

        const outPath = path.join(templateDir, fileName);
        await newWb.xlsx.writeFile(outPath);
        console.log(`   ✅ Exported: ${fileName}`);
    }

    return results;
}

async function main() {
    console.log('🔧 Evidence Template Extractor');
    console.log('='.repeat(60));

    const allResults = [];

    for (const program of PROGRAMS) {
        const results = await extractProgram(program);
        allResults.push(...results);
    }

    // Generate evidence_map.json with all activity→template mappings
    const mapPath = path.join(ROOT, 'src', 'data', 'evidence_map.json');
    const mapData = allResults.map(r => ({
        programIndex: r.programIndex,
        codigo: r.codigo,
        elementoNumero: r.elementoNumero,
        evidenceName: r.evidenceName,
        templateFile: r.sheetName ? `template_evidencia_${sanitize(r.sheetName)}.xlsx` : null
    }));

    fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2), 'utf8');
    console.log(`\n📝 Evidence map saved: ${mapPath}`);

    // Summary
    const withTemplate = allResults.filter(r => r.hasTemplate).length;
    const total = allResults.length;
    console.log(`\n📊 Summary: ${withTemplate}/${total} activities have template files`);
    console.log('   Missing templates:');
    allResults.filter(r => !r.hasTemplate).forEach(r => {
        console.log(`     [${r.programNombre}] ${r.codigo}: "${r.evidenceName}"`);
    });
}

main().catch(e => {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
});
