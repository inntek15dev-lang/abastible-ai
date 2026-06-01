const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const DB_CONFIG = require('../src/config/database.js');

// --- Configuration ---
const CSV_PATH = path.join(__dirname, '../../info/PROGRAMA Distribucion Granel.csv');
const PROG_NOMBRE = 'OIEM Distribución Granel';
const PROG_CODIGO = 'PROG-GRANEL';

// --- Database Connection ---
const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.username, DB_CONFIG.password, {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: DB_CONFIG.dialect,
    logging: console.log
});

const Programa = sequelize.define('Programa', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    meta_cumplimiento: { type: DataTypes.INTEGER, defaultValue: 100 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'programas', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Elemento = sequelize.define('Elemento', {
    programa_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    numero: { type: DataTypes.STRING, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    descripcion: { type: DataTypes.TEXT }
}, { tableName: 'elementos', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Actividad = sequelize.define('Actividad', {
    elemento_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    codigo: { type: DataTypes.STRING, allowNull: false },
    actividad: { type: DataTypes.TEXT, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    criterios: { type: DataTypes.TEXT },
    frecuencia: { type: DataTypes.ENUM('mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique'), defaultValue: 'mensual' },
    requiere_evidencia: { type: DataTypes.BOOLEAN, defaultValue: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    template_url: { type: DataTypes.STRING }
}, { tableName: 'actividades', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

function cleanStr(str) {
    if (!str) return '';
    return str.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'latin1');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    const headerLine = lines[0];
    // Force comma if we are sure, or check for comma count vs semicolon count
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semiCount = (headerLine.match(/;/g) || []).length;
    const delimiter = commaCount > semiCount ? ',' : ';';

    console.log(`Detected delimiter: "${delimiter}" (Comma: ${commaCount}, Semi: ${semiCount})`);

    const headers = headerLine.split(delimiter).map(h => cleanStr(h).toLowerCase());
    console.log('Headers:', headers);

    // Map headers
    const map = {};
    headers.forEach((h, i) => {
        if (h.includes('item') || h.includes('ítem') || h.includes('tem')) map.item = i;
        else if (h.includes('actividad')) map.actividad = i;
        else if (h.includes('criterio') || h.includes('std')) map.criterio = i;
        else if (h.includes('frecuencia')) map.frecuencia = i;
    });
    console.log('Header Map:', map);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(delimiter); // basic split
        // Handle basic requote if needed? Assume simple.
        if (row.length < Object.keys(map).length) continue;

        data.push({
            item: cleanStr(row[map.item]),
            actividad: cleanStr(row[map.actividad]),
            criterio: cleanStr(row[map.criterio]),
            frecuencia: cleanStr(row[map.frecuencia])
        });
    }
    return data;
}

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Manually ALTER table to fix VARCHAR length issue
        try {
            console.log('Altering Actividades table to use TEXT for actividad column...');
            await sequelize.query("ALTER TABLE actividades MODIFY actividad TEXT");
            console.log('Altering Actividades table to use TEXT for criterios column...');
            await sequelize.query("ALTER TABLE actividades MODIFY criterios TEXT");
        } catch (e) {
            console.warn('Alter table failed (might already be TEXT or locked):', e.message);
        }

        // 1. Cleanup Old Datao avoid FK conflicts. Manual ALTER above should suffice.

        // 1. Cleanup Old Data
        const existing = await Programa.findOne({ where: { nombre: PROG_NOMBRE } });
        if (existing) {
            console.log(`Cleaning up program ID ${existing.id}...`);
            const elems = await Elemento.findAll({ where: { programa_id: existing.id } });
            const elemIds = elems.map(e => e.id);
            if (elemIds.length > 0) {
                await Actividad.destroy({ where: { elemento_id: elemIds } });
                await Elemento.destroy({ where: { id: elemIds } });
            }
            await existing.destroy();
            console.log('Cleanup complete.');
        }

        // 2. Parse CSV
        const parsedData = parseCSV(CSV_PATH);
        console.log(`Parsed ${parsedData.length} rows.`);

        // 3. Create Program
        const prog = await Programa.create({
            nombre: PROG_NOMBRE,
            descripcion: 'Programa generado desde CSV',
            codigo: PROG_CODIGO,
            meta_cumplimiento: 85
        });
        console.log(`Program created with ID: ${prog.id}`);

        let currentElement = null;

        for (const row of parsedData) {
            if (!row.item) continue;

            const isElementHeader = !row.item.includes('.');

            if (isElementHeader) {
                console.log(`Creating Element: ${row.item}`);
                const elemName = row.actividad.substring(0, 255);

                // FORCE CREATE
                currentElement = await Elemento.create({
                    programa_id: prog.id,
                    numero: row.item.substring(0, 20), // Truncate
                    nombre: elemName,
                    descripcion: row.actividad,
                    orden: parseInt(row.item) || 0
                });
                console.log(`Element created: ID ${currentElement.id}`);

            } else {
                if (!currentElement) {
                    console.warn(`Skipping activity ${row.item} (No Element)`);
                    continue;
                }

                console.log(`Creating Activity: ${row.item}`);
                let freq = 'mensual';
                if (row.frecuencia) {
                    const fLower = row.frecuencia.toLowerCase();
                    if (fLower.includes('trimestral')) freq = 'trimestral';
                    else if (fLower.includes('semestral')) freq = 'semestral';
                    else if (fLower.includes('anual')) freq = 'anual';
                    else if (fLower.includes('cuando')) freq = 'cuando_aplique';
                }

                await Actividad.create({
                    elemento_id: currentElement.id,
                    codigo: row.item.substring(0, 20), // Truncate to 20
                    actividad: row.actividad.substring(0, 255), // Truncate
                    descripcion: row.actividad,
                    criterios: row.criterio, // Already altered to TEXT
                    frecuencia: freq,
                    requiere_evidencia: true
                });
            }
        }

        // 4. Generate Blueprint JSON
        // Re-read to confirm and export
        const dbElements = await Elemento.findAll({ where: { programa_id: prog.id }, order: [['orden', 'ASC']] });
        console.log(`Found ${dbElements.length} elements in DB for export.`);

        const programJson = {
            nombre: prog.nombre,
            descripcion: prog.descripcion,
            elementos: []
        };

        for (const el of dbElements) {
            const dbActs = await Actividad.findAll({ where: { elemento_id: el.id }, order: [['id', 'ASC']] });
            programJson.elementos.push({
                numero: el.numero,
                nombre: el.nombre,
                actividades: dbActs.map(a => ({
                    codigo: a.codigo,
                    actividad: a.actividad.substring(0, 50), // Short for blueprint
                    descripcion: a.descripcion,
                    criterios: a.criterios,
                    frecuencia: a.frecuencia,
                    requiere_evidencia: a.requiere_evidencia
                }))
            });
        }

        fs.writeFileSync(path.join(__dirname, '../../temp_granel_blueprint_v2.json'), JSON.stringify(programJson, null, 2));
        console.log('JSON Blueprint v2 generated.');

        process.exit(0);
    } catch (e) {
        console.error('Fatal Error:', e);
        if (e.original) console.error(e.original);
        process.exit(1);
    }
}

main();
