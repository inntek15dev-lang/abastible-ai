const fs = require('fs');
const path = require('path');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion } = require('../src/database/models');

const DATA_FILE = path.join(__dirname, '../../info/response-api-contratistas.txt');

async function migrate() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🚀 Iniciando Migración de Contratistas (Protocolo Parko)...');

        // 0. Ensure Schema Exists
        console.log('🛠️ Sincronizando Esquema de Base de Datos...');
        await sequelize.sync({ alter: true });

        // 1. Leer y Parsear archivo
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        const contratistasData = data.contratistas;

        console.log(`📦 Procesando ${contratistasData.length} registros de contratistas.`);

        // 2. Extraer Sets Únicos
        const serviciosSet = new Set();
        const dependenciasSet = new Set();

        contratistasData.forEach(c => {
            c.asignaciones.forEach(a => {
                if (a.servicio) serviciosSet.add(a.servicio.trim());
                if (a.dependencia) dependenciasSet.add(a.dependencia.trim());
            });
        });

        // 3. Insertar Servicios (TipoContratista)
        console.log(`🔄 Sincronizando ${serviciosSet.size} Servicios...`);
        const serviciosMap = new Map();
        for (const nombre of serviciosSet) {
            const [servicio] = await TipoContratista.findOrCreate({
                where: { nombre },
                defaults: { descripcion: 'Migrado desde API', activo: 1 },
                transaction
            });
            serviciosMap.set(nombre, servicio.id);
        }

        // 4. Insertar Dependencias
        console.log(`🔄 Sincronizando ${dependenciasSet.size} Dependencias...`);
        const dependenciasMap = new Map();
        for (const nombre of dependenciasSet) {
            const [dependencia] = await Dependencia.findOrCreate({
                where: { nombre },
                defaults: { activo: 1 },
                transaction
            });
            dependenciasMap.set(nombre, dependencia.id);
        }

        // 5. Insertar Contratistas y Vinculaciones
        console.log('🔄 Procesando Contratistas y Vinculaciones...');
        let contratistasCount = 0;
        let vinculacionesCount = 0;

        for (const c of contratistasData) {
            // Find or Create Contratista
            const [contratista] = await Contratista.findOrCreate({
                where: { rut: c.cot_rut + '-' + c.cot_dv },
                defaults: {
                    nombre: c.cot_razon_social,
                    activo: 1
                },
                transaction
            });
            contratistasCount++;

            // Process Asignaciones
            for (const a of c.asignaciones) {
                if (!a.servicio || !a.dependencia) continue;

                const servicioId = serviciosMap.get(a.servicio.trim());
                const dependenciaId = dependenciasMap.get(a.dependencia.trim());

                if (servicioId && dependenciaId) {
                    const [vinculacion, created] = await Vinculacion.findOrCreate({
                        where: {
                            contratista_id: contratista.id,
                            servicio_id: servicioId,
                            dependencia_id: dependenciaId
                        },
                        defaults: { activo: 1 },
                        transaction
                    });
                    if (created) vinculacionesCount++;
                }
            }
        }

        await transaction.commit();
        console.log('✅ Migración Completada con Éxito!');
        console.log(`   - Servicios: ${serviciosSet.size}`);
        console.log(`   - Dependencias: ${dependenciasSet.size}`);
        console.log(`   - Contratistas: ${contratistasCount}`);
        console.log(`   - Vinculaciones: ${vinculacionesCount}`);

    } catch (error) {
        await transaction.rollback();
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

migrate();
