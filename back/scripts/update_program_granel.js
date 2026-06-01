const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const iconv = require('iconv-lite'); // We might not have this, so we'll use native Buffer

// --- Configuration ---
const CSV_PATH = path.join(__dirname, '../../info/PROGRAMA Distribucion Granel.csv');
const PROG_NOMBRE = 'OIEM Distribución Granel'; // Target Name
const PROG_CODIGO = 'PROG-GRANEL';
const DB_CONFIG = require('../src/config/database.js'); // Correct path

// --- Database Connection ---
const sequelize = new Sequelize(
    DB_CONFIG.database,
    DB_CONFIG.username,
    DB_CONFIG.password,
    {
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        dialect: DB_CONFIG.dialect,
        logging: console.log // Enable logging to see INSERTs
    }
);

const Programa = sequelize.define('Programa', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    meta_cumplimiento: { type: DataTypes.INTEGER, defaultValue: 100 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'programas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

const Elemento = sequelize.define('Elemento', {
    programa_id: { type: DataTypes.INTEGER, allowNull: false },
    numero: { type: DataTypes.STRING, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'elementos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

const Actividad = sequelize.define('Actividad', {
    elemento_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo: { type: DataTypes.STRING, allowNull: false },
    actividad: { type: DataTypes.TEXT, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    criterios: { type: DataTypes.TEXT },
    frecuencia: { type: DataTypes.ENUM('mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique'), defaultValue: 'mensual' },
    requiere_evidencia: { type: DataTypes.BOOLEAN, defaultValue: true },
    template_url: { type: DataTypes.STRING },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'actividades',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// --- Helper Functions ---
function cleanStr(str) {
    if (!str) return '';
    return str.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'latin1'); // Use latin1 to avoid encoding issues
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    // Detect delimiter
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    console.log(`Detected delimiter: "${delimiter}"`);

    const headers = headerLine.split(delimiter).map(h => cleanStr(h).toLowerCase());

    // Map headers to expected keys
    // Expected: Item, Actividades..., Criterios (Standard?), Frecuencia...
    // Let's map dynamically
    const map = {};
    headers.forEach((h, i) => {
        if (h.includes('item') || h.includes('ítem')) map.item = i;
        else if (h.includes('actividad')) map.actividad = i;
        else if (h.includes('criterio') || h.includes('std')) map.criterio = i;
        else if (h.includes('frecuencia')) map.frecuencia = i;
    });

    console.log('Column Mapping:', map);

    const data = [];
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        // Handle split respecting quotes is hard without lib. 
        // For now, simple split. If it fails, we might need a better parser.
        // Assuming simple CSV structure for now.
        const row = lines[i].split(delimiter);

        // Basic re-assembly for split within quotes (imperfect)
        // If delimiter is comma, this is very risky. If semicolon, usually safer.

        if (row.length < Object.keys(map).length) continue;

        const itemVal = cleanStr(row[map.item]);
        const actVal = cleanStr(row[map.actividad]);
        const critVal = cleanStr(row[map.criterio]);
        const freqVal = cleanStr(row[map.frecuencia]);

        data.push({ item: itemVal, actividad: actVal, criterio: critVal, frecuencia: freqVal });
    }
    return data;
}

// --- Main Execution ---
async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 0. RESET PROGRAM (Clean Start)
        // Find existing to get ID, then destroy everything? 
        // Or just destroy by name Cascade?
        // Let's manually clean to be safe.
        const existing = await Programa.findOne({ where: { nombre: PROG_NOMBRE } });
        if (existing) {
            console.log(`Deleting existing program data for cleanup...`);
            // Find elements to delete activities
            const elems = await Elemento.findAll({ where: { programa_id: existing.id } });
            const elemIds = elems.map(e => e.id);
            if (elemIds.length > 0) {
                await Actividad.destroy({ where: { elemento_id: elemIds } });
                await Elemento.destroy({ where: { id: elemIds } });
            }
            await existing.destroy();
            console.log('Cleanup done.');
        }

        // 1. Process Data
        const parsedData = parseCSV(CSV_PATH);
        console.log(`Parsed ${parsedData.length} rows.`);

        // 2. Create Program
        const prog = await Programa.create({
            nombre: PROG_NOMBRE,
            descripcion: 'Programa generado desde CSV',
            codigo: PROG_CODIGO,
            meta_cumplimiento: 85 // restoring 85 as in plan
        });
        console.log(`Program "${prog.nombre}" (ID: ${prog.id}) - Created`);

        let currentElement = null;

        for (const row of parsedData) {
            if (!row.item || row.item.trim() === '') {
                console.warn('Skipping row with empty Item');
                continue;
            }

            const isElementHeader = !row.item.includes('.'); // "1", "2" ok. "1.1" no.

            if (isElementHeader) {
                // It's an Element
                // Create or Update Element
                const elemName = row.actividad.substring(0, 255);
                console.log(`Processing Element: ${row.item} - ${elemName}`);

                const [elem] = await Elemento.findOrCreate({
                    where: { programa_id: prog.id, numero: row.item },
                    defaults: {
                        nombre: elemName,
                        descripcion: row.actividad, // Store full text in description
                        orden: parseInt(row.item)
                    }
                });

                if (elem.nombre !== elemName || elem.descripcion !== row.actividad) {
                    await elem.update({
                        nombre: elemName,
                        descripcion: row.actividad
                    });
                }
                currentElement = elem;
            } else {
                // It's an Activity
                if (!currentElement) {
                    console.warn(`Skipping activity ${row.item} because no parent element found.`);
                    continue;
                }

                // Map Frecuencia
                let freq = 'mensual';
                const fLower = row.frecuencia.toLowerCase();
                if (fLower.includes('trimestral')) freq = 'trimestral';
                else if (fLower.includes('semestral')) freq = 'semestral';
                else if (fLower.includes('anual')) freq = 'anual';
                else if (fLower.includes('cuando')) freq = 'cuando_aplique';

                console.log(`  > Activity ${row.item}: ${row.actividad.substring(0, 30)}...`);

                const [act, actCreated] = await Actividad.findOrCreate({
                    where: { elemento_id: currentElement.id, codigo: row.item },
                    defaults: {
                        actividad: row.actividad, // Short name? Using full for now
                        descripcion: row.actividad, // Using same for desc if not provided
                        criterios: row.criterio,
                        frecuencia: freq,
                        requiere_evidencia: true
                    }
                });

                // Update anyway to sync CSV changes
                await act.update({
                    actividad: row.actividad.substring(0, 255), // Truncate for safety if needed
                    descripcion: row.actividad,
                    criterios: row.criterio,
                    frecuencia: freq
                });
            }
        }

        // ... existing loop ...
        // Capture structure
        // Let's reload from DB to be sure validation passed and we have IDs if needed (though Blueprint doesn't need IDs usually)

        // Since we didn't define associations in this script, let's just reconstruct from parsedData
        // or query manually. Querying manually is safer to reflect DB state.

        const dbElements = await Elemento.findAll({ where: { programa_id: prog.id }, order: [['orden', 'ASC']] });
        const programJson = {
            nombre: prog.nombre,
            descripcion: prog.descripcion,
            elementos: []
        };

        for (const el of dbElements) {
            const dbActs = await Actividad.findAll({ where: { elemento_id: el.id }, order: [['id', 'ASC']] }); // logic for order?
            programJson.elementos.push({
                numero: el.numero,
                nombre: el.nombre,
                actividades: dbActs.map(a => ({
                    codigo: a.codigo,
                    actividad: a.actividad,
                    descripcion: a.descripcion,
                    criterios: a.criterios,
                    frecuencia: a.frecuencia,
                    requiere_evidencia: a.requiere_evidencia
                }))
            });
        }

        fs.writeFileSync(path.join(__dirname, '../../temp_granel_blueprint.json'), JSON.stringify(programJson, null, 2));
        console.log('JSON Blueprint generated.');

        console.log('Update Complete.');
        process.exit(0);

    } catch (e) {
        console.error('Fatal Error:', e);
        if (e.original) console.error('Original Error:', e.original);
        if (e.sql) console.error('SQL:', e.sql);
        process.exit(1);
    }
}

main();
