/**
 * extract_granel_raw.js
 * Specialized script for "Distribución Granel" program.
 * Extracts images (PNG/JPG) from template sheets if they are the main content,
 * otherwise exports the template sheet as CSV.
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const PLANILLAS_DIR = path.resolve(__dirname, '..', '..', 'info', 'medias', 'planillas');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'storage', 'templates_raw');
const EVIDENCE_MAP_FILE = path.resolve(__dirname, '..', 'src', 'data', 'evidence_map.json');

// The specific file we are targeting
const FILENAME = 'Porgrama de Gestión OIEM contratistas Distribución Granel.xlsx';

async function extract() {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Read files in dir to handle Unicode normalization issues (macOS vs Windows)
    const files = fs.readdirSync(PLANILLAS_DIR);
    // Use a simpler match to avoid Unicode normalization issues (like 'ó' vs 'ó')
    const targetFile = files.find(f => f.includes('Granel') && f.endsWith('.xlsx'));

    if (!targetFile) {
        console.error('❌ Could not find the Granel Excel file.');
        return;
    }

    const filePath = path.join(PLANILLAS_DIR, targetFile);
    console.log(`📖 Reading ${targetFile}...`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Find the mapping sheet
    const safetySheet = workbook.getWorksheet('+Seguridad Contratista DI GR');
    if (!safetySheet) {
        console.error('❌ Could not find +Seguridad sheet.');
        return;
    }

    // Load existing evidence_map.json to update it
    let evidenceMap = [];
    if (fs.existsSync(EVIDENCE_MAP_FILE)) {
        evidenceMap = JSON.parse(fs.readFileSync(EVIDENCE_MAP_FILE, 'utf-8'));
    }

    // Find our program index
    // Assuming programIndex 1 for Granel (Envasado=0, Granel=1, Produccion=2, Acotado=3)
    // based on the order in extract_templates.js
    const GRANEL_PROGRAM_INDEX = 1;

    console.log('🔍 Processing activities...');

    // Mapping of activities to templates found in safety sheet
    // Columns in Granel Excel: A=Item, B=Activity, E=Frequency, F=Evidence (linked sheet)
    safetySheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 12) return; // Skip headers

        const codigo = row.getCell(1).text;
        const evidenciaRef = row.getCell(6).text;

        if (!evidenciaRef || evidenciaRef === 'Evidencia' || evidenciaRef.includes('Plataforma') || evidenciaRef.includes('Correo')) {
            return;
        }

        // Try to find the worksheet by name
        let templateWs = workbook.getWorksheet(evidenciaRef);

        // Handle variations in names
        if (!templateWs) {
            templateWs = workbook.worksheets.find(ws =>
                ws.name.toLowerCase().trim() === evidenciaRef.toLowerCase().trim()
            );
        }

        if (templateWs) {
            const safeName = evidenciaRef.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const images = templateWs.model.media || [];

            let finalFileName = '';

            if (images.length > 0) {
                // Extract the first image as representative evidence
                const image = images[0];
                const mediaItem = workbook.model.media.find(m => m.index === image.imageId);

                if (mediaItem) {
                    const ext = mediaItem.extension;
                    finalFileName = `template_evidencia_granel_${codigo}_${safeName}.${ext}`;
                    const outPath = path.join(OUTPUT_DIR, finalFileName);
                    fs.writeFileSync(outPath, mediaItem.buffer);
                    console.log(`  📸 Extracted Image: ${finalFileName}`);
                }
            } else {
                // Export as CSV if no images
                finalFileName = `template_evidencia_granel_${codigo}_${safeName}.csv`;
                const outPath = path.join(OUTPUT_DIR, finalFileName);

                let csvContent = '';
                templateWs.eachRow(r => {
                    const values = r.values.slice(1).map(v => {
                        if (v && typeof v === 'object' && v.result !== undefined) return v.result;
                        if (v && typeof v === 'object' && v.richText) return v.richText.map(t => t.text).join('');
                        return String(v || '').replace(/"/g, '""');
                    });
                    csvContent += `"${values.join('","')}"\n`;
                });

                fs.writeFileSync(outPath, csvContent, 'utf-8');
                console.log(`  📄 Extracted CSV: ${finalFileName}`);
            }

            // Update the map
            const entry = evidenceMap.find(m => m.programIndex === GRANEL_PROGRAM_INDEX && m.codigo === codigo);
            if (entry) {
                entry.templateFile = finalFileName;
                entry.isRaw = true; // Flag for seeder to look in templates_raw
            } else {
                evidenceMap.push({
                    programIndex: GRANEL_PROGRAM_INDEX,
                    codigo: codigo,
                    evidenceName: evidenciaRef,
                    templateFile: finalFileName,
                    isRaw: true
                });
            }
        }
    });

    fs.writeFileSync(EVIDENCE_MAP_FILE, JSON.stringify(evidenceMap, null, 2));
    console.log(`\n✅ Evidence map updated. Files saved to storage/templates_raw/`);
}

extract().catch(console.error);
