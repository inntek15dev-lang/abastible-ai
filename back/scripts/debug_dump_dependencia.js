// Script de diagnóstico de un solo uso: golpea la API externa de OVAL directamente
// (sin pasar por compareData/execute) y vuelca cada aparición de "PLANTA EL PE?ON"
// (con o sin tilde) junto con el registro completo de la empresa donde aparece, para
// confirmar si la inconsistencia de datos viene de OVAL o de nuestro propio código.
const axios = require('axios');

const isProduction = process.env.NODE_ENV === 'production';
const defaultPizzaUrl = isProduction
    ? 'https://ovalcontrol.com/api/getContratistasAbastible'
    : 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';

let EXTERNAL_API_URL = (process.env.PIZZA_API_URL || defaultPizzaUrl).trim().replace(/\r$/, '');
const API_KEY = process.env.PIZZA_API_KEY ? process.env.PIZZA_API_KEY.trim().replace(/\r$/, '') : undefined;
const ORIGIN = process.env.ORIGIN ? process.env.ORIGIN.trim().replace(/\r$/, '') : undefined;

const codePoints = (s) => (s || '').toString().split('').map(c => c.codePointAt(0)).join(',');

async function run() {
    console.log('Consultando:', EXTERNAL_API_URL);
    const response = await axios.get(EXTERNAL_API_URL, {
        headers: { 'api-key': API_KEY, 'Origin': ORIGIN },
        timeout: 30000
    });
    const fullResponse = response.data || {};
    const contratistas = Array.isArray(fullResponse.contratistas) ? fullResponse.contratistas : [];
    console.log('Total contratistas en el payload:', contratistas.length);

    const re = /PLANTA\s+EL\s+PE.ON/i;
    const foundSpellings = new Set();
    let matches = 0;

    contratistas.forEach((c) => {
        const rut = c.cot_dv ? `${c.cot_rut}-${c.cot_dv}` : (c.cot_rut || '').toString();
        const asigsDirect = Array.isArray(c.asignaciones) ? c.asignaciones : null;
        const asigsNested = c.data && Array.isArray(c.data.asignaciones) ? c.data.asignaciones : null;
        const source = asigsDirect ? 'c.asignaciones' : (asigsNested ? 'c.data.asignaciones' : 'NINGUNA');
        const asigs = asigsDirect || asigsNested || [];

        asigs.forEach((a, idx) => {
            if (a && a.dependencia && re.test(a.dependencia)) {
                matches++;
                foundSpellings.add(a.dependencia);
                console.log(`\n--- match #${matches} ---`);
                console.log('empresa:', c.cot_razon_social, '| rut:', rut, '| fuente asignaciones:', source);
                console.log('asignacion[' + idx + ']:', JSON.stringify(a));
                console.log('dependencia codepoints:', codePoints(a.dependencia));
            }
        });
    });

    console.log('\n=== RESUMEN ===');
    console.log('Coincidencias totales:', matches);
    console.log('Variantes de escritura distintas encontradas:', [...foundSpellings]);
    foundSpellings.forEach(s => console.log('  -', JSON.stringify(s), '->', codePoints(s)));

    // Además, volcado específico de ARCA INGENIERIA (rut 77575562-8) sin filtrar por
    // dependencia, para ver TODAS sus asignaciones tal cual las envía OVAL.
    const arca = contratistas.find(c => {
        const rut = c.cot_dv ? `${c.cot_rut}-${c.cot_dv}` : (c.cot_rut || '').toString();
        return rut.replace(/[^0-9Kk]/gi, '').toUpperCase() === '775755628';
    });
    console.log('\n=== ARCA INGENIERIA (rut 77575562-8) — registro completo ===');
    console.log(arca ? JSON.stringify(arca, null, 2) : 'NO ENCONTRADO en el payload actual');
}

run()
    .catch(err => console.error('Error:', err.response ? { status: err.response.status, data: err.response.data } : err.message))
    .finally(() => process.exit());
