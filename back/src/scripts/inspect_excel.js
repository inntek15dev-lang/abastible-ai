const ExcelJS = require('exceljs');

async function inspect() {
    const filePath = 'c:\\Users\\Pablo Solis\\Documents\\GitHub\\abastible-ai\\info\\Programa Distribución ENVASADO version 2026.xlsx';
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('PROGRAMA ANUAL');
    
    for (let r = 1; r <= 50; r++) {
        const row = sheet.getRow(r);
        const vals = [];
        for (let c = 1; c <= 15; c++) {
            const val = row.getCell(c).value;
            // Format nicely
            let displayVal = '';
            if (val && typeof val === 'object' && val.richText) {
                displayVal = val.richText.map(rt => rt.text).join('');
            } else if (val !== null && val !== undefined) {
                displayVal = String(val);
            }
            vals.push(`${c}: ${displayVal.substring(0, 30)}`);
        }
        console.log(`Row ${r}:`, vals.filter(v => v.split(': ')[1]).join(' | '));
    }
}
inspect().catch(console.error);
