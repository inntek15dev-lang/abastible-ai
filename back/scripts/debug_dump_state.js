// Script de diagnóstico de un solo uso, SOLO LECTURA: reporta (1) cuántas vinculaciones
// activas existen realmente, y (2) grupos de nombres duplicados en TipoContratista
// (servicios) y Dependencia, con sus ids y códigos de carácter, para confirmar si son
// duplicados reales (filas gemelas) o solo strings visualmente parecidos.
const { TipoContratista, Dependencia, Vinculacion, Contratista } = require('../src/database/models');

const codePoints = (s) => (s || '').toString().split('').map(c => c.codePointAt(0)).join(',');

async function run() {
    const totalVinc = await Vinculacion.count();
    const activeVinc = await Vinculacion.count({ where: { activo: 1 } });
    const totalContratistas = await Contratista.count();
    const activeContratistas = await Contratista.count({ where: { activo: 1 } });

    console.log('=== CONTEOS GENERALES ===');
    console.log('Vinculaciones: total =', totalVinc, '| activo=1 =', activeVinc);
    console.log('Contratistas: total =', totalContratistas, '| activo=1 =', activeContratistas);

    const sampleVinc = await Vinculacion.findAll({ limit: 5, attributes: ['id', 'contratista_id', 'servicio_id', 'dependencia_id', 'subgerencia_id', 'gerencia_id', 'activo', 'numero_contrato'] });
    console.log('\n=== MUESTRA DE 5 VINCULACIONES (crudo, sin joins) ===');
    sampleVinc.forEach(v => console.log(v.toJSON()));

    console.log('\n=== SERVICIOS (TipoContratista) — grupos con nombre EXACTO duplicado ===');
    const servicios = await TipoContratista.findAll({ attributes: ['id', 'nombre', 'subgerencia_id', 'activo'] });
    const servByName = new Map();
    servicios.forEach(s => {
        if (!servByName.has(s.nombre)) servByName.set(s.nombre, []);
        servByName.get(s.nombre).push(s);
    });
    let servDupGroups = 0;
    for (const [nombre, rows] of servByName) {
        if (rows.length > 1) {
            servDupGroups++;
            console.log(`  "${nombre}" [${codePoints(nombre)}] -> ${rows.length} filas: ${rows.map(r => `id=${r.id}(subg=${r.subgerencia_id},activo=${r.activo})`).join(', ')}`);
        }
    }
    console.log(`Total servicios: ${servicios.length} | nombres únicos: ${servByName.size} | grupos duplicados exactos: ${servDupGroups}`);

    console.log('\n=== DEPENDENCIAS — grupos con nombre EXACTO duplicado ===');
    const deps = await Dependencia.findAll({ attributes: ['id', 'nombre', 'activo'] });
    const depByName = new Map();
    deps.forEach(d => {
        if (!depByName.has(d.nombre)) depByName.set(d.nombre, []);
        depByName.get(d.nombre).push(d);
    });
    let depDupGroups = 0;
    for (const [nombre, rows] of depByName) {
        if (rows.length > 1) {
            depDupGroups++;
            console.log(`  "${nombre}" [${codePoints(nombre)}] -> ${rows.length} filas: ${rows.map(r => `id=${r.id}(activo=${r.activo})`).join(', ')}`);
        }
    }
    console.log(`Total dependencias: ${deps.length} | nombres únicos: ${depByName.size} | grupos duplicados exactos: ${depDupGroups}`);

    // Duplicados "case/trim-insensitive" (por si el duplicado no es 100% exacto)
    console.log('\n=== SERVICIOS — grupos duplicados ignorando mayúsculas/espacios ===');
    const servByNorm = new Map();
    servicios.forEach(s => {
        const key = (s.nombre || '').trim().toUpperCase();
        if (!servByNorm.has(key)) servByNorm.set(key, []);
        servByNorm.get(key).push(s);
    });
    for (const [key, rows] of servByNorm) {
        if (rows.length > 1) {
            console.log(`  "${key}" -> ${rows.map(r => `id=${r.id} nombre="${r.nombre}" [${codePoints(r.nombre)}]`).join(' | ')}`);
        }
    }

    console.log('\n=== DEPENDENCIAS — grupos duplicados ignorando mayúsculas/espacios (posible duplicado "invisible") ===');
    const depByNorm = new Map();
    deps.forEach(d => {
        const key = (d.nombre || '').trim().toUpperCase();
        if (!depByNorm.has(key)) depByNorm.set(key, []);
        depByNorm.get(key).push(d);
    });
    let depNormDupGroups = 0;
    for (const [key, rows] of depByNorm) {
        if (rows.length > 1) {
            depNormDupGroups++;
            console.log(`  "${key}" -> ${rows.map(r => `id=${r.id} nombre="${r.nombre}" [${codePoints(r.nombre)}]`).join(' | ')}`);
        }
    }
    console.log(`Grupos duplicados (normalizado): ${depNormDupGroups}`);

    console.log('\n=== TODAS las dependencias (nombre + codepoints, para inspección visual) ===');
    deps.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).forEach(d => {
        console.log(`  id=${d.id} "${d.nombre}" [${codePoints(d.nombre)}]`);
    });
}

run()
    .catch(err => console.error('Error:', err.message))
    .finally(() => process.exit());
