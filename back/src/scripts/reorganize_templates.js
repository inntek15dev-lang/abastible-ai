const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../');
const backRoot = path.join(projectRoot, 'back');

const templateSource = path.join(backRoot, 'storage', 'templates_evidencia');
const templateRawSource = path.join(backRoot, 'storage', 'templates_raw');
const evidenceMapPath = path.join(backRoot, 'src', 'data', 'evidence_map.json');

const sanitizeStr = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();

const programs = [
    'OIM Distribución Envasado',
    'OIM Distribución Granel',
    'OIM Distribución Envasado Acotado',
    'Programa OIEM Produccion Movilizado',
    'Programa Distribución ENVASADO version 2026',
    'Programa Distribución Granel version 2026'
];

async function run() {
    if (!fs.existsSync(evidenceMapPath)) {
        console.error('No se encontró evidence_map.json');
        return;
    }

    const evidenceMap = JSON.parse(fs.readFileSync(evidenceMapPath, 'utf-8'));

    // Create folders
    programs.forEach(progName => {
        const slug = sanitizeStr(progName);
        const tplDir = path.join(templateSource, slug);
        const rawDir = path.join(templateRawSource, slug);

        if (!fs.existsSync(tplDir)) fs.mkdirSync(tplDir, { recursive: true });
        if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
        console.log(`📁 Carpeta creada para: ${slug}`);
    });

    // Move files and update evidence map
    evidenceMap.forEach(entry => {
        if (!entry.templateFile) return;

        const progName = programs[entry.programIndex];
        if (!progName) return;

        const slug = sanitizeStr(progName);
        const fileName = path.basename(entry.templateFile); // just in case it already had folder prefix

        const sourceDir = entry.isRaw ? templateRawSource : templateSource;
        const destDir = path.join(sourceDir, slug);

        const oldPath = path.join(sourceDir, entry.templateFile);
        const newPath = path.join(destDir, fileName);

        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            console.log(`🚚 Movido: ${oldPath} -> ${newPath}`);
        } else {
            // Check if it was already moved
            if (fs.existsSync(newPath)) {
                console.log(`ℹ️ El archivo ya estaba en su destino: ${newPath}`);
            } else {
                console.log(`⚠️ Archivo no encontrado en origen ni destino: ${oldPath}`);
            }
        }

        // We update the templateFile in evidence_map.json if we want it to just be the basename,
        // because seed.js will construct the path using: templates_evidencia/<programSlug>/<templateFile>
        entry.templateFile = fileName;
    });

    fs.writeFileSync(evidenceMapPath, JSON.stringify(evidenceMap, null, 2), 'utf-8');
    console.log('✅ Actualizado evidence_map.json');
}

run().catch(console.error);
