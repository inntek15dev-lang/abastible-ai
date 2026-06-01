// Deep analysis of Evidencia column - handle merged cells and find all activity-template mappings
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const basePath = path.resolve(__dirname, '..', 'info', 'medias', 'planillas');

async function run() {
    const allFiles = fs.readdirSync(basePath).filter(f => f.endsWith('.xlsx'));

    for (const filename of allFiles) {
        const filePath = path.join(basePath, filename);
        console.log('\n=== FILE:', filename, '===');

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(filePath);
        const ws = wb.worksheets[0]; // PROGRAMA ANUAL

        // Show all merged cells
        console.log('\nMerged cell ranges (first 20):');
        const merges = ws.model.merges || [];
        merges.slice(0, 20).forEach(m => console.log('  ', m));

        // Deep scan all rows from 5 to 100 to find activities with ITEM, Activity description, and Evidencia
        console.log('\nDeep scan (rows 5-100, all cols 1-6):');
        for (let r = 5; r <= Math.min(ws.rowCount, 100); r++) {
            const row = ws.getRow(r);
            const cellValues = [];
            for (let c = 1; c <= 6; c++) {
                const cell = row.getCell(c);
                let val = getCellText(cell);
                // Check if part of merged range and get master value
                if (!val && cell.isMerged) {
                    val = '[MERGED]';
                }
                cellValues.push(val.substring(0, 50));
            }
            const hasContent = cellValues.some(v => v && v !== '' && v !== '[MERGED]');
            if (hasContent) {
                console.log(`  R${r}: ` + cellValues.map((v, i) => `[C${i + 1}]=${v || '·'}`).join(' | '));
            }
        }

        // Also scan the secondary sheet ("+Seguridad" or "Hoja1") which might be the real program sheet
        // Based on image, the layout looks like it has: N° | ELEMENTO | ACTIVIDAD | Descripción | CRITERIOS | Frecuencia | CUMPLE | AUDITOR | OBS | RESPONSABLE | EVIDENCIA
        // Let's check Hoja1 or the last sheet
        const hoja1 = wb.worksheets.find(ws => ws.name === 'Hoja1') || wb.worksheets.find(ws => ws.name.includes('+Seguridad'));
        if (hoja1) {
            console.log('\n--- Checking sheet "' + hoja1.name + '" ---');
            // Show headers (row 5 or detect)
            for (let r = 1; r <= Math.min(hoja1.rowCount, 10); r++) {
                const row = hoja1.getRow(r);
                const cells = [];
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    const val = getCellText(cell);
                    if (val) cells.push(`[C${colNumber}]=${val.substring(0, 30)}`);
                });
                if (cells.length > 0) console.log(`  R${r}: ${cells.join(' | ')}`);
            }
        }

        // Check +Seguridad sheet for program activities
        const segSheet = wb.worksheets.find(ws => ws.name.includes('Seguridad Contra'));
        if (segSheet) {
            console.log('\n--- Checking sheet "' + segSheet.name + '" ---');
            for (let r = 1; r <= Math.min(segSheet.rowCount, 15); r++) {
                const row = segSheet.getRow(r);
                const cells = [];
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    const val = getCellText(cell);
                    if (val) cells.push(`[C${colNumber}]=${val.substring(0, 30)}`);
                });
                if (cells.length > 0) console.log(`  R${r}: ${cells.join(' | ')}`);
            }
        }
    }
}

function getCellText(cell) {
    if (!cell || !cell.value) return '';
    if (typeof cell.value === 'object') {
        if (cell.value.richText) return cell.value.richText.map(rt => rt.text).join('');
        if (cell.value.text !== undefined) return cell.value.text;
        if (cell.value.result !== undefined) return String(cell.value.result);
        return JSON.stringify(cell.value).substring(0, 80);
    }
    return String(cell.value);
}

run().catch(e => console.error('Error:', e.message, e.stack));
