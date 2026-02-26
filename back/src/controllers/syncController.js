const axios = require('axios');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion } = require('../database/models');

const EXTERNAL_API_URL = process.env.PIZZA_API_URL || 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';
const API_KEY = process.env.PIZZA_API_KEY;
const ORIGIN = process.env.ORIGIN;

// Helper to normalize strings for comparison
const normalize = (str) => str ? str.trim().toUpperCase() : '';

const compareData = async (req, res) => {
    try {
        console.log('🔄 Iniciando sincronización de datos...');

        let externalData;
        try {
            const response = await axios.get(EXTERNAL_API_URL, {
                headers: { 'api-key': API_KEY, 'Origin': ORIGIN }
            });
            externalData = response.data.contratistas;
        } catch (error) {
            console.warn('⚠️ Error fetching external API, using mock data for dev/testing if needed (or fail).');
            return res.status(500).json({ message: 'Error fetching external API' });
        }

        // 1. Prepare External Sets
        const extServicios = new Map();
        const extDependencias = new Map();
        const extContratistas = new Map();
        const extVinculaciones = [];

        externalData.forEach(c => {
            const rut = `${c.cot_rut}-${c.cot_dv}`;
            extContratistas.set(rut, { ...c, rut });

            c.asignaciones.forEach(a => {
                if (a.servicio) extServicios.set(normalize(a.servicio), a.servicio);
                if (a.dependencia) extDependencias.set(normalize(a.dependencia), a.dependencia);

                if (a.servicio && a.dependencia) {
                    extVinculaciones.push({
                        rut_contratista: rut,
                        servicio: normalize(a.servicio),
                        dependencia: normalize(a.dependencia),
                        numero_contrato: a.contrato || null,
                        fecha_inicio_contrato: a.fecha_inicio || null, // Assuming API field names, adjust if known
                        fecha_termino_contrato: a.fecha_termino || null
                    });
                }
            });
        });

        // 2. Fetch Local Data
        const localServicios = await TipoContratista.findAll();
        const localDependencias = await Dependencia.findAll();
        const localContratistas = await Contratista.findAll();
        // Optimizing Vinculacion check might require more specific queries or loading all (careful with volume)
        // For now, we'll check existence during processing or load all if volume allows (536 is small)
        const localVinculaciones = await Vinculacion.findAll({
            include: [
                { model: Contratista, as: 'contratista' },
                { model: TipoContratista, as: 'servicio' },
                { model: Dependencia, as: 'dependencia' }
            ]
        });

        // 3. Compare Servicios
        const diffServicios = [];
        const localServiciosNames = new Set(localServicios.map(s => normalize(s.nombre)));

        extServicios.forEach((originalName, normName) => {
            if (!localServiciosNames.has(normName)) {
                diffServicios.push({ nombre: originalName, estado: 'new' });
            } else {
                diffServicios.push({ nombre: originalName, estado: 'exists' });
            }
        });

        // 4. Compare Dependencias
        const diffDependencias = [];
        const localDependenciasNames = new Set(localDependencias.map(d => normalize(d.nombre)));

        extDependencias.forEach((originalName, normName) => {
            if (!localDependenciasNames.has(normName)) {
                diffDependencias.push({ nombre: originalName, estado: 'new' });
            } else {
                diffDependencias.push({ nombre: originalName, estado: 'exists' });
            }
        });

        // 5. Compare Contratistas
        const diffContratistas = [];
        const localContratistasRuts = new Set(localContratistas.map(c => c.rut));

        extContratistas.forEach((data, rut) => {
            if (!localContratistasRuts.has(rut)) {
                diffContratistas.push({
                    rut,
                    nombre: data.cot_razon_social,
                    estado: 'new',
                    data: data // Keep raw data for insertion
                });
            } else {
                diffContratistas.push({ rut, nombre: data.cot_razon_social, estado: 'exists' });
            }
        });

        // 6. Compare Vinculaciones
        const diffVinculaciones = [];
        // Helper to create a key for vinculaciones
        const getVincKey = (rut, serv, dep) => `${rut}|${serv}|${dep}`;
        const localVinculacionesMap = new Map();

        localVinculaciones.forEach(v => {
            if (v.contratista && v.servicio && v.dependencia) {
                const key = getVincKey(v.contratista.rut, normalize(v.servicio.nombre), normalize(v.dependencia.nombre));
                localVinculacionesMap.set(key, v.numero_contrato);
            }
        });

        extVinculaciones.forEach(v => {
            const key = getVincKey(v.rut_contratista, v.servicio, v.dependencia);
            const contratistaName = extContratistas.get(v.rut_contratista).cot_razon_social;
            const servicioName = extServicios.get(v.servicio);
            const dependenciaName = extDependencias.get(v.dependencia);

            // Calculate effective dates as per sync rules
            // Start: Default to 1st of current month if missing
            const effectiveStartDate = v.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            // End: Default to NULL (Indefinite) if missing
            const effectiveEndDate = v.fecha_termino_contrato || null;

            if (!localVinculacionesMap.has(key)) {
                diffVinculaciones.push({
                    contratista: contratistaName,
                    rut: v.rut_contratista,
                    servicio: servicioName,
                    dependencia: dependenciaName,
                    numero_contrato: v.numero_contrato,
                    fecha_inicio_contrato: effectiveStartDate,
                    fecha_termino_contrato: effectiveEndDate,
                    estado: 'new'
                });
            } else {
                const localNum = localVinculacionesMap.get(key);
                const needsUpdate = normalize(v.numero_contrato) !== normalize(localNum);
                // Note: needsUpdate currently only checks contract number, dates are updated if external provides them or to enforce defaults.
                // Could be expanded to check dates here too for 'updated' status, but for now we focus on visualization.

                diffVinculaciones.push({
                    contratista: contratistaName,
                    rut: v.rut_contratista,
                    servicio: servicioName,
                    dependencia: dependenciaName,
                    numero_contrato: v.numero_contrato,
                    fecha_inicio_contrato: effectiveStartDate,
                    fecha_termino_contrato: effectiveEndDate,
                    local_numero_contrato: localNum,
                    estado: needsUpdate ? 'updated' : 'exists'
                });
            }
        });

        res.json({
            servicios: diffServicios,
            dependencias: diffDependencias,
            contratistas: diffContratistas,
            vinculaciones: diffVinculaciones
        });

    } catch (error) {
        console.error('Error in compareData:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const syncData = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { type, items } = req.body; // type: 'servicios', 'dependencias', etc.
        console.log(`📥 Syncing ${items.length} items of type ${type}...`);

        if (!Array.isArray(items)) {
            throw new Error('Invalid items format: expected array');
        }

        if (type === 'servicios') {
            for (const item of items) {
                try {
                    await TipoContratista.findOrCreate({
                        where: { nombre: item.nombre },
                        defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                        transaction
                    });
                } catch (err) {
                    console.error('Error syncing servicio:', item, err);
                    throw err;
                }
            }
        } else if (type === 'dependencias') {
            for (const item of items) {
                try {
                    await Dependencia.findOrCreate({
                        where: { nombre: item.nombre },
                        defaults: { activo: 1 },
                        transaction
                    });
                } catch (err) {
                    console.error('Error syncing dependencia:', item, err);
                    throw err;
                }
            }
        } else if (type === 'contratistas') {
            for (const item of items) {
                try {
                    // Normalize rut if needed or validate
                    if (!item.rut || !item.nombre) {
                        console.warn('Skipping invalid contratista item:', item);
                        continue;
                    }
                    await Contratista.findOrCreate({
                        where: { rut: item.rut },
                        defaults: {
                            nombre: item.nombre,
                            activo: 1
                        },
                        transaction
                    });
                } catch (err) {
                    console.error('Error syncing contratista:', item, err);
                    throw new Error(`Error syncing contratista (RUT: ${item.rut || 'unknown'}): ${err.message}`);
                }
            }
        } else if (type === 'vinculaciones') {
            for (const item of items) {
                try {
                    // Ensure dependecies exist (they should if step 1-3 were done)
                    const contratista = await Contratista.findOne({ where: { rut: item.rut }, transaction });
                    const servicio = await TipoContratista.findOne({ where: { nombre: item.servicio }, transaction });
                    const dependencia = await Dependencia.findOne({ where: { nombre: item.dependencia }, transaction });

                    if (contratista && servicio && dependencia) {
                        const [vinculacion, created] = await Vinculacion.findOrCreate({
                            where: {
                                contratista_id: contratista.id,
                                servicio_id: servicio.id,
                                dependencia_id: dependencia.id
                            },
                            defaults: {
                                activo: 1,
                                numero_contrato: item.numero_contrato || null,
                                fecha_inicio_contrato: item.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Default: 1st of current month
                                fecha_termino_contrato: item.fecha_termino_contrato || null // Default: Indefinite
                            },
                            transaction
                        });

                        const updateData = {};
                        let needsUpdate = false;

                        if (!created) {
                            if (normalize(vinculacion.numero_contrato) !== normalize(item.numero_contrato)) {
                                updateData.numero_contrato = item.numero_contrato;
                                needsUpdate = true;
                            }
                            // Update dates if provided and different, or if we want to enforce defaults on existing records (optional, assuming we only update if external has data or we missed it)
                            // For now, let's update if external has data or if local is null and we have a default
                            const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

                            // Check Start Date
                            if (item.fecha_inicio_contrato && vinculacion.fecha_inicio_contrato !== item.fecha_inicio_contrato) {
                                updateData.fecha_inicio_contrato = item.fecha_inicio_contrato;
                                needsUpdate = true;
                            } else if (!vinculacion.fecha_inicio_contrato) {
                                updateData.fecha_inicio_contrato = defaultStart;
                                needsUpdate = true;
                            }

                            // Check End Date
                            if (item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== item.fecha_termino_contrato) {
                                updateData.fecha_termino_contrato = item.fecha_termino_contrato;
                                needsUpdate = true;
                            }
                            // If item.fecha_termino_contrato is null/undefined, we leave it as is or set to null? User said: "detect null -> assume indefinite -> set NULL".
                            // If local has a date and external says null (indefinite), should we clear it? 
                            // Rule: "if NO DATE/NULL from API -> assume Indefinite -> put NULL in BD".
                            // So if external is missing, we ensure local is NULL.
                            if (!item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== null) {
                                updateData.fecha_termino_contrato = null;
                                needsUpdate = true;
                            }

                            if (needsUpdate) {
                                await vinculacion.update(updateData, { transaction });
                            }
                        }
                    } else {
                        console.warn('Missing dependencies for vinculacion:', item, {
                            c: !!contratista,
                            s: !!servicio,
                            d: !!dependencia
                        });
                    }
                } catch (err) {
                    console.error('Error syncing vinculacion:', item, err);
                    throw new Error(`Error syncing vinculacion (RUT: ${item.rut || 'unknown'}, Service: ${item.servicio}): ${err.message}`);
                }
            }
        }

        await transaction.commit();
        res.json({ success: true, message: `Synced ${items.length} items.` });

    } catch (error) {
        await transaction.rollback();
        console.error('Error in syncData:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message, stack: error.stack });
    }
};

module.exports = {
    compareData,
    syncData
};
