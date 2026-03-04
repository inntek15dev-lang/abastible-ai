// Script to analyze Excel files and extract Evidencia column data + hyperlinks
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const basePath = path.resolve(__dirname, '..', 'info', 'medias', 'planillas');

async function run() {
    // List actual files
    const allFiles = fs.readdirSync(basePath);
    console.log('Files in planillas dir:', allFiles);

    for (const filename of allFiles) {
        if (!filename.endsWith('.xlsx')) continue;

        const filePath = path.join(basePath, filename);
        console.log('\n' + '='.repeat(80));
        console.log('FILE:', filename);
        console.log('='.repeat(80));

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(filePath);

        console.log(`Sheets (${wb.worksheets.length}):`);
        wb.worksheets.forEach(ws => {
            const images = ws.getImages();
            console.log(`  - "${ws.name}" (rows: ${ws.rowCount}, cols: ${ws.columnCount}, images: ${images.length})`);
        });

        const mainSheet = wb.worksheets[0];

        // Show first 5 rows
        console.log('\nFirst 5 rows of main sheet:');
        for (let r = 1; r <= Math.min(mainSheet.rowCount, 5); r++) {
            const row = mainSheet.getRow(r);
            const cells = [];
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                let val = getCellText(cell);
                cells.push(`[C${colNumber}]=${val.substring(0, 25)}`);
            });
            if (cells.length > 0) console.log(`  Row ${r}: ${cells.join(' | ')}`);
        }

        // Find Evidencia and Codigo columns
        let headerRow = null;
        let evidenciaCol = null;
        let codigoCol = null;

        for (let r = 1; r <= Math.min(mainSheet.rowCount, 10); r++) {
            const row = mainSheet.getRow(r);
            row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const val = getCellText(cell).toLowerCase().trim();
                if (val.includes('evidencia') && !val.includes('cumplimiento')) {
                    if (!evidenciaCol) {
                        headerRow = r;
                        evidenciaCol = colNumber;
                    }
                }
                if (!codigoCol && (val.includes('código') || val.includes('cod') || val === 'n°' || val.match(/^n\s*°/))) {
                    codigoCol = colNumber;
                }
            });
        }

        if (!evidenciaCol) {
            console.log('  ⚠ No Evidencia column found');
            continue;
        }

        console.log(`\nEvidencia: row ${headerRow}, col ${evidenciaCol} | Codigo: col ${codigoCol}`);

        console.log('\nEvidencia data:');
        for (let r = (headerRow || 1) + 1; r <= mainSheet.rowCount; r++) {
            const row = mainSheet.getRow(r);
            const evidCell = row.getCell(evidenciaCol);
            const codigoCell = codigoCol ? row.getCell(codigoCol) : null;

            if (!evidCell.value) continue;

            const codigo = codigoCell ? getCellText(codigoCell).trim() : '';
            if (!codigo) continue;

            const evidText = getCellText(evidCell).trim();
            let hyperlink = getHyperlink(evidCell);

            if (evidText) {
                const linkInfo = hyperlink ? ` -> LINK: ${hyperlink}` : '';
                console.log(`  [${codigo}] "${evidText}"${linkInfo}`);
            }
        }

        // Show template sheets
        console.log('\n--- Other sheets (potential templates) ---');
        for (let i = 1; i < wb.worksheets.length; i++) {
            const ws = wb.worksheets[i];
            const images = ws.getImages();
            console.log(`  Sheet "${ws.name}" (rows:${ws.rowCount}, cols:${ws.columnCount}, imgs:${images.length})`);
            for (let r = 1; r <= Math.min(ws.rowCount, 2); r++) {
                const row = ws.getRow(r);
                const cells = [];
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    cells.push(getCellText(cell).substring(0, 30));
                });
                if (cells.length > 0) console.log(`    Row ${r}: ${cells.join(' | ')}`);
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

function getHyperlink(cell) {
    if (cell.hyperlink) return cell.hyperlink;
    if (cell.value && typeof cell.value === 'object' && cell.value.hyperlink) return cell.value.hyperlink;
    return '';
}

run().catch(e => console.error('Error:', e.message, e.stack));
