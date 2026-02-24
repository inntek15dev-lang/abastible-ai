const fs = require('fs');

const csvPath = 'c:\\laragon\\www\\a-oiem-ai\\info\\PROGRAMA Distribucion Granel.csv';

function cleanString(str) {
    if (!str) return '';
    return str.trim()
        .replace(/^"|"$/g, '')
        .replace(/""/g, '"');
}

try {
    // Determine encoding: utf8 might break characters, latin1 is safer for old Excel CSVs
    const buffer = fs.readFileSync(csvPath);
    let content = buffer.toString('latin1');

    // Naive CSV parser for semicolon delimited
    // We assume strict CSV structure for now: 
    // Item;Actividades;Criterios;Frecuencia
    // If lines are broken by newlines inside quotes, this simple split fails.
    // Let's try to handle quoted fields better if needed, but start simple.

    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    // Headers
    const headers = lines[0].split(';').map(h => cleanString(h));
    console.log('Detected Headers:', headers);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        // Handle basic split. If quotes contain semicolons, this is insufficient.
        // But for many simple exports, this works.
        const cols = lines[i].split(';');
        if (cols.length < 2) continue; // Skip empty rows

        let rowObj = {};
        headers.forEach((h, idx) => {
            rowObj[h] = cleanString(cols[idx]);
        });
        rows.push(rowObj);
    }

    console.log('Row Count:', rows.length);
    if (rows.length > 0) {
        console.log('First Row Sample:', JSON.stringify(rows[0], null, 2));
        console.log('Last Row Sample:', JSON.stringify(rows[rows.length - 1], null, 2));
    }

    // Attempt to structure data by Element
    // Logic: If 'Item' has value like '1', '2' -> New Element
    // If 'Item' is X.X -> Activity under current Element
    // Or maybe Item designates the element and activities are listed?

} catch (e) {
    console.error('Error:', e.message);
}
