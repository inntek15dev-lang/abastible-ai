const fs = require('fs');
const path = require('path');
const ExcelJS = require(path.join(__dirname, '../../../../back/node_modules/exceljs'));

const projectRoot = path.resolve(__dirname, '../../../../');
const backRoot = path.join(projectRoot, 'back');

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+/, '')
        .replace(/_+$/, '');
}

function cleanString(str) {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').trim();
}

function getCellString(cell) {
    const val = cell.value;
    if (val && typeof val === 'object' && val.richText) {
        return val.richText.map(rt => rt.text).join('');
    }
    if (val !== null && val !== undefined) {
        return String(val);
    }
    return '';
}

async function run() {
    const excelPath = 'c:\\Users\\Pablo Solis\\Documents\\GitHub\\abastible-ai\\info\\Programa Distribución ENVASADO version 2026.xlsx';
    const programName = 'Programa Distribución ENVASADO version 2026';
    const programSlug = slugify(programName);

    console.log(`📖 Leyendo Excel: ${excelPath}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    
    // Find sheet
    const worksheet = workbook.getWorksheet('PROGRAMA ANUAL') || workbook.worksheets[0];
    console.log(`Usando hoja de programa: ${worksheet.name}`);

    const elementsMap = new Map();
    let currentElement = null;

    worksheet.eachRow((row, rowNumber) => {
        // Skip metadata/header rows (usually rows 1-5)
        if (rowNumber <= 5) return;

        const codeCell = row.getCell(1).value;
        const code = codeCell ? String(codeCell).trim() : '';
        const col2Val = cleanString(getCellString(row.getCell(2)));
        const col3Val = cleanString(getCellString(row.getCell(3)));
        const criteria = cleanString(getCellString(row.getCell(4)));
        const freqText = cleanString(getCellString(row.getCell(5))).toLowerCase();

        if (!code && !col2Val) return;

        // Check if this is an Element row (e.g. code is an integer, or code doesn't contain a dot but col2Val is populated)
        const isElement = code && !code.includes('.') && isFinite(code);

        if (isElement) {
            currentElement = {
                numero: code,
                nombre: col2Val,
                actividades: []
            };
            elementsMap.set(code, currentElement);
            console.log(`Elemento encontrado: ${code} - ${col2Val}`);
        } else if (code.includes('.')) {
            // Activity row
            // If currentElement is not set, find or create element based on the prefix of the code (e.g. "1.1" -> element "1")
            const elementNum = code.split('.')[0];
            let element = elementsMap.get(elementNum);
            if (!element) {
                element = {
                    numero: elementNum,
                    nombre: col2Val || `Elemento ${elementNum}`,
                    actividades: []
                };
                elementsMap.set(elementNum, element);
            }

            let frequency = 'mensual';
            if (freqText.includes('mensual')) frequency = 'mensual';
            else if (freqText.includes('trimestral')) frequency = 'trimestral';
            else if (freqText.includes('semestral')) frequency = 'semestral';
            else if (freqText.includes('anual')) frequency = 'anual';
            else if (freqText.includes('aplique') || freqText.includes('cuando')) frequency = 'cuando_aplique';
            else if (freqText.includes('bianual')) frequency = 'anual';

            element.actividades.push({
                codigo: code,
                actividad: col2Val || col3Val,
                descripcion: col3Val || col2Val,
                frecuencia: frequency,
                criterios: criteria || 'Evidencia de cumplimiento',
                requiere_evidencia: criteria ? 1 : 0
            });
        }
    });

    const programData = Array.from(elementsMap.values());
    console.log(`Cargados ${programData.length} elementos con actividades.`);

    // Match and extract sheets as templates
    const templatesDir = path.join(backRoot, 'storage', 'templates_evidencia');
    if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
    }

    const sheetNames = workbook.worksheets.map(w => w.name);
    
    for (const element of programData) {
        for (const act of element.actividades) {
            const criteriaLower = act.criterios.toLowerCase();
            // Try to find a matching sheet in the workbook
            const matchedSheetName = sheetNames.find(name => {
                const nameLower = name.toLowerCase();
                // Match if sheet name is contained in the criteria, or vice versa
                return (nameLower.length > 3 && (criteriaLower.includes(nameLower) || nameLower.includes(criteriaLower)));
            });

            if (matchedSheetName) {
                const tplFileName = `template_${slugify(act.codigo)}_${slugify(matchedSheetName)}.xlsx`;
                const tplPath = path.join(templatesDir, tplFileName);
                
                // Export this specific sheet to a new workbook
                const newWb = new ExcelJS.Workbook();
                const sourceSheet = workbook.getWorksheet(matchedSheetName);
                
                // ExcelJS copy sheet workaround
                const newSheet = newWb.addWorksheet(matchedSheetName);
                sourceSheet.eachRow((row, rNum) => {
                    const newRow = newSheet.getRow(rNum);
                    row.eachCell((cell, cNum) => {
                        newRow.getCell(cNum).value = cell.value;
                    });
                });

                await newWb.xlsx.writeFile(tplPath);
                act.templateFile = tplFileName;
                console.log(`📁 Copiada y generada plantilla para ${act.codigo} desde hoja "${matchedSheetName}" -> ${tplFileName}`);
            } else {
                act.templateFile = null;
            }
        }
    }

    // Write program JS file
    const programDataFileContent = `const ${programSlug}ProgramData = ${JSON.stringify(programData, null, 4)};

module.exports = ${programSlug}ProgramData;
`;
    const programDataPath = path.join(backRoot, 'src', 'data', `${programSlug}.js`);
    fs.writeFileSync(programDataPath, programDataFileContent, 'utf-8');
    console.log(`✅ Archivo del programa guardado en: ${programDataPath}`);

    // Update seed.js
    const seedjsPath = path.join(backRoot, 'src', 'seed.js');
    if (fs.existsSync(seedjsPath)) {
        let seedContent = fs.readFileSync(seedjsPath, 'utf-8');

        // Check if program is already in programs array
        if (seedContent.includes(`nombre: '${programName}'`)) {
            console.log(`⚠️ El programa ya está referenciado en seed.js`);
        } else {
            // Find programs array end or start
            const programasDataStart = seedContent.indexOf('const programasData = [');
            if (programasDataStart !== -1) {
                const insertIndex = seedContent.indexOf('];', programasDataStart);
                if (insertIndex !== -1) {
                    const beforeInsert = seedContent.slice(programasDataStart, insertIndex).trim();
                    const needsComma = beforeInsert.length > 0 && !beforeInsert.endsWith(',');
                    const comma = needsComma ? ',' : '';
                    const newProgLine = `${comma}\n            { nombre: '${programName}', descripcion: 'Programa HSE y Operacional ${programName}', activo: 1 }`;
                    seedContent = seedContent.slice(0, insertIndex).trimEnd() + newProgLine + '\n        ];' + seedContent.slice(insertIndex + 2);
                    console.log(`✅ Programa agregado a programasData en seed.js`);
                }
            }

            // Find current programs count in programsData to compute programIndex
            const progMatches = seedContent.match(/\{ nombre: '[^']+', descripcion: '[^']+', activo: 1 \}/g) || [];
            const newIndex = progMatches.length - 1; // since it was just added

            // Find datasets array
            const datasetsStart = seedContent.indexOf('const datasets = [');
            if (datasetsStart !== -1) {
                const insertIndex = seedContent.indexOf('];', datasetsStart);
                if (insertIndex !== -1) {
                    const beforeInsert = seedContent.slice(datasetsStart, insertIndex).trim();
                    const needsComma = beforeInsert.length > 0 && !beforeInsert.endsWith(',');
                    const comma = needsComma ? ',' : '';
                    const newDatasetLine = `${comma}\n            { data: require('./data/${programSlug}'), programa_id: programas[${newIndex}].id, msg: '${programName}' }`;
                    seedContent = seedContent.slice(0, insertIndex).trimEnd() + newDatasetLine + '\n        ];' + seedContent.slice(insertIndex + 2);
                    console.log(`✅ Dataset de actividades agregado a datasets en seed.js`);
                }
            }

            fs.writeFileSync(seedjsPath, seedContent, 'utf-8');
        }
    }

    // Update evidence_map.json
    const evidenceMapPath = path.join(backRoot, 'src', 'data', 'evidence_map.json');
    if (fs.existsSync(evidenceMapPath)) {
        let evidenceMap = [];
        try {
            evidenceMap = JSON.parse(fs.readFileSync(evidenceMapPath, 'utf-8'));
        } catch (e) {
            console.error('Error parseando evidence_map.json:', e);
        }

        const seedContent = fs.readFileSync(seedjsPath, 'utf-8');
        const progMatches = seedContent.match(/\{ nombre: '[^']+', descripcion: '[^']+', activo: 1 \}/g) || [];
        const programIndex = progMatches.findIndex(m => m.includes(`'${programName}'`));

        if (programIndex !== -1) {
            evidenceMap = evidenceMap.filter(entry => entry.programIndex !== programIndex);

            programData.forEach(elem => {
                elem.actividades.forEach(act => {
                    if (act.templateFile) {
                        evidenceMap.push({
                            programIndex: programIndex,
                            codigo: act.codigo,
                            elementoNumero: elem.numero,
                            evidenceName: act.criterios,
                            templateFile: act.templateFile
                        });
                    }
                });
            });

            fs.writeFileSync(evidenceMapPath, JSON.stringify(evidenceMap, null, 2), 'utf-8');
            console.log(`✅ Actualizado evidence_map.json con mapeos de plantillas para el nuevo programa`);
        }
    }

    console.log(`🚀 Proceso completado exitosamente.`);
}

run().catch(console.error);
