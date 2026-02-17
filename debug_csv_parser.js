const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
// Need to install iconv-lite or handle manually? Node.js supports latin1 in fs.readFileSync with encoding 'latin1'

const csvPath = 'c:\\laragon\\www\\a-oiem-ai\\info\\PROGRAMA Distribucion Granel.csv';

function cleanString(str) {
    if (!str) return '';
    return str.trim()
        .replace(/^"|"$/g, '') // remove surrounding quotes
        .replace(/""/g, '"'); // handle escaped quotes
}

try {
    const buffer = fs.readFileSync(csvPath);
    // Try to decode as latin1 (common for Excel exported CSVs in Spanish regions)
    const content = buffer.toString('latin1');

    // Split lines but handle quoted newlines if possible (simple split first)
    // For simple CSVs from Excel, typically newlines are real newlines.
    const lines = content.split(/\r?\n/).filter(l => l.trim());

    if (lines.length < 2) {
        throw new Error('CSV is empty or invalid');
    }

    // Headers are in the first line
    const headers = lines[0].split(';').map(h => cleanString(h));
    console.log('Headers:', headers);

    const elementsMap = new Map();
    let currentElement = null;

    // Iterate lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Handle potential semicolons inside quotes? 
        // Simple split for now, assuming standard Excel CSV export format
        // If complex, use a library, but let's try manual split first for simplicity in this env
        const values = line.split(';').map(v => cleanString(v));

        // Map columns by index based on header inspection
        // Default assumption: 0=Item, 1=Activity, 2=Criteria, 3=Freq?
        // We will see header log above to confirm index.
        // Let's output raw first to verify indices.
    }

    // For now, just output the first few rows to debug column mapping
    const sampleSize = 5;
    const sample = lines.slice(1, sampleSize + 1).map(line => line.split(';').map(cleanString));

    console.log('Sample Data (First 5 rows):');
    console.log(JSON.stringify(sample, null, 2));

} catch (e) {
    console.error('Error:', e.message);
}
