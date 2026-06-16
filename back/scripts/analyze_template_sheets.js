/**
 * analyze_template_sheets.js
 * Deep analysis of every sheet in each Excel to understand template content.
 * Dumps: headers, cell values, merged cells, row/col counts, images, formulas.
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const PLANILLAS = path.resolve(__dirname, '..', '..', 'info', 'medias', 'planillas');
// Read directory dynamically to handle Unicode normalization
const FILES = fs.readdirSync(PLANILLAS).filter(f => f.endsWith('.xlsx'));

function getCellText(cell) {
    if (!cell || !cell.value) return '';
    const v = cell.value;
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (v.richText) return v.richText.map(rt => rt.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    if (v.formula) return `[FORMULA: ${v.formula}]`;
    return JSON.stringify(v);
}

async function analyzeFile(filename) {
    const filePath = path.join(PLANILLAS, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`\n❌ NOT FOUND: ${filename}`);
        return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📂 FILE: ${filename}`);
    console.log(`${'='.repeat(80)}`);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    // First find the +Seguridad sheet and extract activity→evidence mapping
    const segSheet = wb.worksheets.find(ws => ws.name.includes('Seguridad'));
    if (segSheet) {
        console.log(`\n🔍 +SEGURIDAD SHEET: "${segSheet.name}"`);
        console.log(`   Rows: ${segSheet.rowCount}, Cols: ${segSheet.columnCount}`);

        // Find header row
        let headerRow = null;
        let evidCol = null;
        let itemCol = null;
        for (let r = 1; r <= Math.min(segSheet.rowCount, 20); r++) {
            const row = segSheet.getRow(r);
            for (let c = 1; c <= Math.min(segSheet.columnCount, 15); c++) {
                const val = getCellText(row.getCell(c)).toLowerCase().trim();
                if (val.includes('evidencia')) {
                    headerRow = r;
                    evidCol = c;
                }
                if (val.includes('ítem') || val.includes('item') || val === 'n°') {
                    itemCol = c;
                }
            }
            if (headerRow) break;
        }

        console.log(`   Header row: ${headerRow}, Evidence col: ${evidCol}, Item col: ${itemCol}`);

        // Dump headers
        if (headerRow) {
            const hRow = segSheet.getRow(headerRow);
            console.log('   HEADERS:');
            for (let c = 1; c <= Math.min(segSheet.columnCount, 15); c++) {
                const val = getCellText(hRow.getCell(c)).trim();
                if (val) console.log(`     C${c}: "${val}"`);
            }
        }

        // Dump activity→evidence rows
        if (headerRow && evidCol) {
            console.log('\n   ACTIVITY → EVIDENCE MAPPING:');
            for (let r = headerRow + 1; r <= segSheet.rowCount; r++) {
                const row = segSheet.getRow(r);
                const item = getCellText(row.getCell(itemCol || 1)).trim();
                const evidence = getCellText(row.getCell(evidCol)).trim();
                const activity = getCellText(row.getCell((itemCol || 1) + 1)).trim();

                if (!item && !evidence) continue;
                if (item || evidence) {
                    console.log(`     ${item || '?'} | ${activity.substring(0, 50)} | EVID: "${evidence}"`);
                }
            }
        }
    }

    // Analyze ALL other sheets (potential templates)
    for (const ws of wb.worksheets) {
        if (ws.name.includes('Seguridad')) continue; // Skip +Seguridad (already analyzed)
        if (ws.name === 'PROGRAMA ANUAL' || ws.name === 'Hoja1' || ws.name === 'Indicadores') continue;

        console.log(`\n  📄 TEMPLATE SHEET: "${ws.name}"`);
        console.log(`     Rows: ${ws.rowCount}, Cols: ${ws.columnCount}`);

        // Count images
        const imageCount = (ws.getImages && ws.getImages().length) || 0;
        console.log(`     Images: ${imageCount}`);

        // Count merged cells
        const merges = ws.model.merges || [];
        console.log(`     Merged cells: ${merges.length}`);

        // Dump ALL non-empty cells (up to row 50)
        console.log('     CONTENT:');
        let contentRows = 0;
        for (let r = 1; r <= Math.min(ws.rowCount, 60); r++) {
            const row = ws.getRow(r);
            let rowContent = [];
            for (let c = 1; c <= Math.min(ws.columnCount, 20); c++) {
                const val = getCellText(row.getCell(c)).trim();
                if (val) {
                    rowContent.push(`C${c}:"${val.substring(0, 80)}"`);
                }
            }
            if (rowContent.length > 0) {
                console.log(`       R${r}: ${rowContent.join(' | ')}`);
                contentRows++;
            }
        }
        if (contentRows === 0) {
            console.log('       (empty - likely images only)');
        }

        // Check for hyperlinks
        let hyperlinks = [];
        for (let r = 1; r <= Math.min(ws.rowCount, 60); r++) {
            const row = ws.getRow(r);
            for (let c = 1; c <= Math.min(ws.columnCount, 20); c++) {
                const cell = row.getCell(c);
                if (cell.value && cell.value.hyperlink) {
                    hyperlinks.push(`R${r}C${c}: ${cell.value.hyperlink}`);
                }
            }
        }
        if (hyperlinks.length) {
            console.log(`     HYPERLINKS: ${hyperlinks.join(', ')}`);
        }
    }

    // Also check the main PROGRAMA ANUAL sheet for evidence column
    const mainSheet = wb.worksheets.find(ws => ws.name.includes('PROGRAMA'));
    if (mainSheet && !mainSheet.name.includes('Seguridad')) {
        console.log(`\n  📋 MAIN SHEET: "${mainSheet.name}"`);

        // Find "Evidencia Requerida" column
        for (let r = 1; r <= Math.min(mainSheet.rowCount, 10); r++) {
            const row = mainSheet.getRow(r);
            for (let c = 1; c <= Math.min(mainSheet.columnCount, 25); c++) {
                const val = getCellText(row.getCell(c)).toLowerCase().trim();
                if (val.includes('evidencia')) {
                    console.log(`     Found "evidencia" at R${r}C${c}: "${getCellText(row.getCell(c))}"`);
                }
            }
        }
    }
}

async function main() {
    console.log('🔬 DEEP TEMPLATE SHEET ANALYSIS');
    console.log('Analyzing all sheets in all 4 Excel files\n');

    for (const file of FILES) {
        await analyzeFile(file);
    }

    console.log('\n\n✅ Analysis complete');
}

main().catch(e => { console.error(e); process.exit(1); });
