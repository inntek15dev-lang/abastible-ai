const fs = require('fs');
const path = require('path');
const csvPath = 'c:\\laragon\\www\\a-oiem-ai\\info\\PROGRAMA Distribucion Granel.csv';

try {
    const content = fs.readFileSync(csvPath, 'latin1'); // Trying latin1 for typical Excel CSVs in Spanish
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(';').map(h => h.trim()); // Assuming semicolon delimiter for Spanish CSV

    const data = lines.slice(1).map(line => {
        const values = line.split(';');
        let obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : '';
        });
        return obj;
    });

    console.log(JSON.stringify(data, null, 2));
} catch (e) {
    console.error(e);
}
