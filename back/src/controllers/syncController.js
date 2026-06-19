const axios = require('axios');
const bcrypt = require('bcryptjs');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion, User, Administracion, Gerencia, Subgerencia, ContratistaUsuario } = require('../database/models');

const EXTERNAL_API_URL = process.env.PIZZA_API_URL || 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';
const API_KEY = process.env.PIZZA_API_KEY;
const ORIGIN = process.env.ORIGIN;

const normalize = (str) => str ? str.trim().toUpperCase() : '';

const cleanRutString = (rutStr) => {
    if (!rutStr) return '';
    return rutStr.toString().replace(/[^0-9Kk]/g, '').toUpperCase();
};

const buildContractorLookups = (externalContratistas) => {
    const contractorsLookup = new Map(); // cleanRut -> { fullRut, nombre }
    const contractorsByBaseLookup = new Map(); // baseRut -> { fullRut, nombre }

    if (Array.isArray(externalContratistas)) {
        externalContratistas.forEach(c => {
            let rawRut = c.rut;
            if (!rawRut && c.cot_rut) {
                rawRut = `${c.cot_rut}-${c.cot_dv}`;
            }
            if (!rawRut) return;

            const nombre = c.nombre || c.cot_razon_social || '';
            const clean = cleanRutString(rawRut);
            if (!clean) return;

            let fullRut = rawRut;
            if (clean.length >= 2) {
                const dv = clean.slice(-1);
                const base = clean.slice(0, -1);
                fullRut = `${base}-${dv}`;
                
                contractorsLookup.set(clean, { fullRut, nombre });
                contractorsByBaseLookup.set(base, { fullRut, nombre });
            }
            
            contractorsLookup.set(normalize(rawRut), { fullRut, nombre });
            if (c.cot_rut) {
                contractorsByBaseLookup.set(normalize(c.cot_rut.toString()), { fullRut, nombre });
            }
        });
    }

    const resolveContractor = (rawRut, fallbackName = '') => {
        if (!rawRut) return { rut: '99999999-9', nombre: fallbackName || 'Empresa Sincronizada' };
        const clean = cleanRutString(rawRut);
        if (!clean) return { rut: '99999999-9', nombre: fallbackName || 'Empresa Sincronizada' };
        
        let match = contractorsLookup.get(clean);
        if (match) return { rut: match.fullRut, nombre: match.nombre };
        
        if (clean.length >= 8) {
            const base = clean.slice(0, -1);
            match = contractorsByBaseLookup.get(base);
            if (match) return { rut: match.fullRut, nombre: match.nombre };
        }
        
        match = contractorsByBaseLookup.get(clean);
        if (match) return { rut: match.fullRut, nombre: match.nombre };
        
        match = contractorsLookup.get(normalize(rawRut));
        if (match) return { rut: match.fullRut, nombre: match.nombre };

        let formatted = rawRut;
        if (clean.length >= 2) {
            const dv = clean.slice(-1);
            const base = clean.slice(0, -1);
            formatted = `${base}-${dv}`;
        }
        return { rut: formatted, nombre: fallbackName || rawRut || 'Empresa Sincronizada' };
    };

    return { contractorsLookup, contractorsByBaseLookup, resolveContractor };
};


const compareData = async (req, res) => {
    try {
        console.log('🔄 Iniciando comparación de datos completa...');
        console.log(`📡 Consultando API Externa: ${EXTERNAL_API_URL}`);

        let response;
        try {
            response = await axios.get(EXTERNAL_API_URL, {
                headers: { 'api-key': API_KEY, 'Origin': ORIGIN },
                timeout: 15000 // 15s timeout
            });
        } catch (axiosError) {
            console.error('❌ Error de Axios al consultar la API externa:', {
                message: axiosError.message,
                code: axiosError.code,
                url: EXTERNAL_API_URL,
                status: axiosError.response?.status,
                headers: axiosError.response?.headers,
                data: axiosError.response?.data
            });

            const errorMsg = axiosError.response?.data?.message || axiosError.message;
            return res.status(502).json({
                message: 'Error al consultar la API externa de contratistas (getContratistasAbastible)',
                error: errorMsg,
                statusCode: axiosError.response?.status || null,
                details: axiosError.response?.data || null
            });
        }

        const fullResponse = response.data || {};
        if (!fullResponse || typeof fullResponse !== 'object') {
            console.error('❌ La API externa retornó un formato de datos inválido (no es un objeto JSON).');
            return res.status(502).json({
                message: 'La API externa retornó un formato de datos inválido.',
                details: typeof fullResponse
            });
        }

        const externalContratistas = Array.isArray(fullResponse.contratistas) ? fullResponse.contratistas : [];
        const { resolveContractor } = buildContractorLookups(externalContratistas);

        const extGerencias = new Map();
        const extSubgerencias = new Map();
        const extServicios = new Map();
        const extDependencias = new Map();
        const extContratistas = new Map();
        const extContratistaAdmins = new Map();
        const extVinculaciones = [];
        const extAdministradorContratos = new Map();

        const subgerenciaToGerenciaMap = new Map();
        // Pre-populate map from local database to resolve as many as possible
        const localSubgerenciasForMap = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
        localSubgerenciasForMap.forEach(s => {
            if (s.nombre && s.gerencia && s.gerencia.nombre) {
                subgerenciaToGerenciaMap.set(normalize(s.nombre), s.gerencia.nombre);
            }
        });

        // 1. Process Top-Level Arrays (New standard)
        if (Array.isArray(fullResponse.gerencias)) {
            fullResponse.gerencias.forEach(g => {
                if (g && g.nombre) extGerencias.set(normalize(g.nombre), g.nombre);
            });
        }

        if (Array.isArray(fullResponse.subgerencias)) {
            fullResponse.subgerencias.forEach(s => {
                if (s && s.nombre && s.gerencia) {
                    extSubgerencias.set(normalize(s.gerencia + '|' + s.nombre), {
                        nombre: s.nombre,
                        gerencia: s.gerencia
                    });
                    extGerencias.set(normalize(s.gerencia), s.gerencia);
                    subgerenciaToGerenciaMap.set(normalize(s.nombre), s.gerencia);
                }
            });
        }

        if (Array.isArray(fullResponse.servicios)) {
            fullResponse.servicios.forEach(s => {
                if (s && s.nombre && s.subgerencia) {
                    const gerenciaName = s.gerencia || subgerenciaToGerenciaMap.get(normalize(s.subgerencia)) || null;
                    extServicios.set(normalize(s.subgerencia + '|' + s.nombre), {
                        nombre: s.nombre,
                        subgerencia: s.subgerencia,
                        gerencia: gerenciaName
                    });
                }
            });
        }

        if (Array.isArray(fullResponse.dependencias)) {
            fullResponse.dependencias.forEach(d => {
                if (d && d.nombre) extDependencias.set(normalize(d.nombre), d.nombre);
            });
        }

        if (Array.isArray(fullResponse.contratista_admin)) {
            fullResponse.contratista_admin.forEach(admin => {
                if (admin && admin.email) {
                    const resolved = resolveContractor(admin.rut_contratista);
                    const emailNorm = normalize(admin.email);
                    if (extContratistaAdmins.has(emailNorm)) {
                        const existing = extContratistaAdmins.get(emailNorm);
                        if (!existing.rut_contratistas.includes(resolved.rut)) {
                            existing.rut_contratistas.push(resolved.rut);
                        }
                    } else {
                        extContratistaAdmins.set(emailNorm, {
                            nombre: admin.nombre,
                            email: admin.email,
                            rut_contratista: resolved.rut,
                            rut_contratistas: [resolved.rut]
                        });
                    }
                }
            });
        }

        if (Array.isArray(fullResponse.administrador_contrato)) {
            fullResponse.administrador_contrato.forEach(admin => {
                if (admin && admin.email) {
                    let key = normalize(admin.email);
                    let existing = extAdministradorContratos.get(key);
                    const formattedAsigs = (admin.asignaciones || []).map(asig => {
                        if (!asig) return null;
                        const resolved = resolveContractor(asig.rut_contratista || asig.cot_rut);
                        return {
                            rut_contratista: resolved.rut,
                            servicio: normalize(asig.servicio),
                            dependencia: normalize(asig.dependencia),
                            subgerencia: normalize(asig.subgerencia),
                            gerencia: normalize(asig.gerencia),
                            contrato: asig.contrato || asig.numero_contrato || null
                        };
                    }).filter(Boolean);

                    if (existing) {
                        const mergedAsignaciones = [...existing.asignaciones];
                        formattedAsigs.forEach(newAsig => {
                            const alreadyExists = mergedAsignaciones.some(oldAsig =>
                                normalize(oldAsig.servicio) === normalize(newAsig.servicio) &&
                                normalize(oldAsig.dependencia) === normalize(newAsig.dependencia) &&
                                normalize(oldAsig.subgerencia) === normalize(newAsig.subgerencia) &&
                                normalize(oldAsig.gerencia) === normalize(newAsig.gerencia)
                            );
                            if (!alreadyExists) {
                                mergedAsignaciones.push(newAsig);
                            } else if (newAsig.rut_contratista) {
                                // If already exists but lacks rut_contratista, enrich it!
                                const target = mergedAsignaciones.find(oldAsig =>
                                    normalize(oldAsig.servicio) === normalize(newAsig.servicio) &&
                                    normalize(oldAsig.dependencia) === normalize(newAsig.dependencia) &&
                                    normalize(oldAsig.subgerencia) === normalize(newAsig.subgerencia) &&
                                    normalize(oldAsig.gerencia) === normalize(newAsig.gerencia)
                                );
                                if (target && !target.rut_contratista) {
                                    target.rut_contratista = newAsig.rut_contratista;
                                }
                            }
                        });
                        existing.asignaciones = mergedAsignaciones;
                    } else {
                        extAdministradorContratos.set(key, {
                            nombre: admin.nombre,
                            email: admin.email,
                            asignaciones: formattedAsigs
                        });
                    }
                }
            });
        }

        if (Array.isArray(fullResponse.vinculaciones)) {
            fullResponse.vinculaciones.forEach(v => {
                if (v) {
                    const resolved = resolveContractor(v.rut_contratista);
                    extVinculaciones.push({
                        rut_contratista: resolved.rut,
                        servicio: normalize(v.servicio),
                        dependencia: normalize(v.dependencia),
                        subgerencia: normalize(v.subgerencia),
                        gerencia: normalize(v.gerencia),
                        numero_contrato: v.numero_contrato || null,
                        fecha_inicio_contrato: v.fecha_inicio_contrato || null,
                        fecha_termino_contrato: v.fecha_termino_contrato || null
                    });
                }
            });
        }

        // 2. Process Contratistas and Nested Data (Legacy/Backup)
        externalContratistas.forEach(c => {
            if (!c) return;
            let rawRut = c.rut;
            if (!rawRut && c.cot_rut) {
                rawRut = `${c.cot_rut}-${c.cot_dv}`;
            }
            if (!rawRut) return;

            const resolved = resolveContractor(rawRut, c.nombre || c.cot_razon_social);
            extContratistas.set(resolved.rut, { ...c, rut: resolved.rut, nombre: resolved.nombre });

            const admins = c.contratista_admin || (c.data && c.data.contratista_admin);
            if (admins && Array.isArray(admins)) {
                admins.forEach(admin => {
                    if (admin && admin.email) {
                        const resolvedAdminRut = resolveContractor(rawRut);
                        const emailNorm = normalize(admin.email);
                        if (extContratistaAdmins.has(emailNorm)) {
                            const existing = extContratistaAdmins.get(emailNorm);
                            if (!existing.rut_contratistas.includes(resolvedAdminRut.rut)) {
                                existing.rut_contratistas.push(resolvedAdminRut.rut);
                            }
                        } else {
                            extContratistaAdmins.set(emailNorm, {
                                nombre: admin.nombre,
                                email: admin.email,
                                rut_contratista: resolvedAdminRut.rut,
                                rut_contratistas: [resolvedAdminRut.rut]
                            });
                        }
                    }
                });
            }

            const asigs = c.asignaciones || (c.data && c.data.asignaciones);
            if (asigs && Array.isArray(asigs)) {
                asigs.forEach(a => {
                    if (!a) return;
                    if (a.gerencia) extGerencias.set(normalize(a.gerencia), a.gerencia);

                    if (a.subgerencia && a.gerencia) {
                        extSubgerencias.set(normalize(a.gerencia + '|' + a.subgerencia), {
                            nombre: a.subgerencia,
                            gerencia: a.gerencia
                        });
                        subgerenciaToGerenciaMap.set(normalize(a.subgerencia), a.gerencia);
                    }

                    if (a.servicio && a.subgerencia) {
                        const gerenciaName = a.gerencia || subgerenciaToGerenciaMap.get(normalize(a.subgerencia)) || null;
                        extServicios.set(normalize(a.subgerencia + '|' + a.servicio), {
                            nombre: a.servicio,
                            subgerencia: a.subgerencia,
                            gerencia: gerenciaName
                        });
                    }

                    if (a.dependencia) extDependencias.set(normalize(a.dependencia), a.dependencia);

                    if (a.servicio && a.dependencia && a.subgerencia && (a.gerencia || subgerenciaToGerenciaMap.get(normalize(a.subgerencia)))) {
                        const gerenciaName = a.gerencia || subgerenciaToGerenciaMap.get(normalize(a.subgerencia));
                        const resolvedAsigContractor = resolveContractor(rawRut, c.nombre || c.cot_razon_social);
                        extVinculaciones.push({
                            rut_contratista: resolvedAsigContractor.rut,
                            servicio: normalize(a.servicio),
                            dependencia: normalize(a.dependencia),
                            subgerencia: normalize(a.subgerencia),
                            gerencia: normalize(gerenciaName),
                            numero_contrato: a.contrato || null,
                            fecha_inicio_contrato: a.fecha_inicio || null,
                            fecha_termino_contrato: a.fecha_termino || null,
                            contratista: resolvedAsigContractor.nombre
                        });

                        const adminList = a.administradores_contrato || a.administrador_contrato;
                        if (adminList && Array.isArray(adminList)) {
                            adminList.forEach(admin => {
                                if (!admin) return;
                                // Handle both object and string format (since response has array of strings sometimes)
                                const email = admin.email || (typeof admin === 'string' && admin.includes('@') ? admin : null);
                                const nombre = admin.nombre || (typeof admin === 'string' ? admin : null);
                                
                                if (email) {
                                    let key = normalize(email);
                                    let adminObj = extAdministradorContratos.get(key);
                                    if (!adminObj) {
                                        adminObj = { nombre: nombre || email.split('@')[0], email: email, asignaciones: [] };
                                        extAdministradorContratos.set(key, adminObj);
                                    }
                                    
                                    const newAsig = {
                                        rut_contratista: resolvedAsigContractor.rut,
                                        servicio: normalize(a.servicio),
                                        dependencia: normalize(a.dependencia),
                                        subgerencia: normalize(a.subgerencia),
                                        gerencia: normalize(gerenciaName),
                                        contrato: a.contrato || null
                                    };

                                    const alreadyExists = adminObj.asignaciones.some(oldAsig =>
                                        normalize(oldAsig.servicio) === newAsig.servicio &&
                                        normalize(oldAsig.dependencia) === newAsig.dependencia &&
                                        normalize(oldAsig.subgerencia) === newAsig.subgerencia &&
                                        normalize(oldAsig.gerencia) === newAsig.gerencia
                                    );

                                    if (!alreadyExists) {
                                        adminObj.asignaciones.push(newAsig);
                                    } else {
                                        // Enrich rut_contratista if missing
                                        const target = adminObj.asignaciones.find(oldAsig =>
                                            normalize(oldAsig.servicio) === newAsig.servicio &&
                                            normalize(oldAsig.dependencia) === newAsig.dependencia &&
                                            normalize(oldAsig.subgerencia) === newAsig.subgerencia &&
                                            normalize(oldAsig.gerencia) === newAsig.gerencia
                                        );
                                        if (target) {
                                            if (!target.rut_contratista) target.rut_contratista = resolvedAsigContractor.rut;
                                            if (!target.contrato && newAsig.contrato) target.contrato = newAsig.contrato;
                                        }
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });

        // Fetch Local Data
        const localGerencias = await Gerencia.findAll();
        const localSubgerencias = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
        const localServicios = await TipoContratista.findAll({ include: [{ model: Subgerencia, as: 'subgerencia' }] });
        const localDependencias = await Dependencia.findAll();
        const localContratistas = await Contratista.findAll();
        const localUsers = await User.findAll();
        const localVinculaciones = await Vinculacion.findAll({
            include: [
                { model: Contratista, as: 'contratista' },
                { model: TipoContratista, as: 'servicio' },
                { model: Dependencia, as: 'dependencia' },
                { model: Subgerencia, as: 'subgerencia' },
                { model: Gerencia, as: 'gerencia' }
            ]
        });

        // Maps for fast lookup
        const locGerenciasMap = new Set(localGerencias.map(g => normalize(g.nombre)));
        const locSubgerenciasMap = new Set(localSubgerencias.map(s => normalize((s.gerencia ? s.gerencia.nombre : '') + '|' + s.nombre)));
        const locServiciosMap = new Set(localServicios.map(s => normalize((s.subgerencia ? s.subgerencia.nombre : '') + '|' + s.nombre)));
        const locDependenciasMap = new Set(localDependencias.map(d => normalize(d.nombre)));
        const locContratistasMap = new Set(localContratistas.map(c => cleanRutString(c.rut)));
        const locUsersMap = new Set(localUsers.map(u => normalize(u.email)));

        const locVinculacionesMap = new Map();
        localVinculaciones.forEach(v => {
            if (v.contratista && v.servicio && v.dependencia && v.subgerencia && v.gerencia) {
                const cleanRut = cleanRutString(v.contratista.rut);
                const key = `${cleanRut}|${normalize(v.servicio.nombre)}|${normalize(v.dependencia.nombre)}|${normalize(v.subgerencia.nombre)}|${normalize(v.gerencia.nombre)}`;
                locVinculacionesMap.set(key, v.numero_contrato);
            }
        });

        // 1. Gerencias
        const diffGerencias = [];
        extGerencias.forEach((name, normName) => {
            diffGerencias.push({ nombre: name, estado: locGerenciasMap.has(normName) ? 'exists' : 'new' });
        });

        // 2. Subgerencias
        const diffSubgerencias = [];
        extSubgerencias.forEach((data, normKey) => {
            diffSubgerencias.push({ nombre: data.nombre, gerencia: data.gerencia, estado: locSubgerenciasMap.has(normKey) ? 'exists' : 'new' });
        });

        // 3. Servicios
        const diffServicios = [];
        extServicios.forEach((data, normKey) => {
            diffServicios.push({ nombre: data.nombre, subgerencia: data.subgerencia, gerencia: data.gerencia, estado: locServiciosMap.has(normKey) ? 'exists' : 'new' });
        });

        // 4. Dependencias
        const diffDependencias = [];
        extDependencias.forEach((name, normName) => {
            diffDependencias.push({ nombre: name, estado: locDependenciasMap.has(normName) ? 'exists' : 'new' });
        });

        const diffContratistas = [];
        extContratistas.forEach((data, rut) => {
            const resolved = resolveContractor(rut, data.nombre);
            const isExisting = locContratistasMap.has(cleanRutString(resolved.rut));
            diffContratistas.push({ ...data, rut: resolved.rut, nombre: resolved.nombre, estado: isExisting ? 'exists' : 'new' });
        });

        const diffContratistaAdmin = [];
        extContratistaAdmins.forEach((data, normEmail) => {
            const primaryRut = data.rut_contratista || (data.rut_contratistas && data.rut_contratistas[0]) || '99999999-9';
            const resolved = resolveContractor(primaryRut);
            const resolvedNames = (data.rut_contratistas || []).map(r => resolveContractor(r).nombre);
            diffContratistaAdmin.push({
                nombre: data.nombre,
                email: data.email,
                rut_contratista: primaryRut,
                contratista: resolvedNames.join(', ') || resolved.nombre,
                rut_contratistas: data.rut_contratistas || [primaryRut],
                estado: locUsersMap.has(normEmail) ? 'exists' : 'new'
            });
        });

        const diffVinculaciones = [];
        extVinculaciones.forEach(v => {
            const resolved = resolveContractor(v.rut_contratista, v.contratista);
            const cleanRut = cleanRutString(resolved.rut);
            const key = `${cleanRut}|${normalize(v.servicio)}|${normalize(v.dependencia)}|${normalize(v.subgerencia)}|${normalize(v.gerencia)}`;
            const effectiveStartDate = v.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const effectiveEndDate = v.fecha_termino_contrato || null;

            if (!locVinculacionesMap.has(key)) {
                diffVinculaciones.push({ ...v, rut_contratista: resolved.rut, contratista: resolved.nombre, fecha_inicio_contrato: effectiveStartDate, fecha_termino_contrato: effectiveEndDate, estado: 'new' });
            } else {
                const localNum = locVinculacionesMap.get(key);
                const needsUpdate = normalize(v.numero_contrato) !== normalize(localNum);
                diffVinculaciones.push({ ...v, rut_contratista: resolved.rut, contratista: resolved.nombre, fecha_inicio_contrato: effectiveStartDate, fecha_termino_contrato: effectiveEndDate, local_numero_contrato: localNum, estado: needsUpdate ? 'updated' : 'exists' });
            }
        });

        const diffAdministradorContrato = [];
        extAdministradorContratos.forEach((data, normEmail) => {
            const resolvedAsignaciones = (data.asignaciones || []).map(asig => {
                if (!asig) return null;
                const resolved = resolveContractor(asig.rut_contratista, asig.contratista);
                return {
                    ...asig,
                    rut_contratista: resolved.rut,
                    contratista: resolved.nombre
                };
            }).filter(Boolean);
            diffAdministradorContrato.push({
                ...data,
                asignaciones: resolvedAsignaciones,
                estado: locUsersMap.has(normEmail) ? 'exists' : 'new'
            });
        });

        res.json({
            gerencias: diffGerencias,
            subgerencias: diffSubgerencias,
            servicios: diffServicios,
            dependencias: diffDependencias,
            contratistas: diffContratistas,
            contratista_admin: diffContratistaAdmin,
            vinculaciones: diffVinculaciones,
            administrador_contrato: diffAdministradorContrato
        });

    } catch (error) {
        console.error('❌ Error no controlado en compareData:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const syncData = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { type, items } = req.body;
        console.log(`📥 Syncing ${items.length} items of type ${type}...`);

        if (!Array.isArray(items)) throw new Error('Invalid items format');

        const defaultPasswordHash = await bcrypt.hash('User123*', 10);

        // Fetch external data for enrichment
        let externalContratistas = [];
        let fullResponse = {};
        try {
            const response = await axios.get(EXTERNAL_API_URL, {
                headers: { 'api-key': API_KEY, 'Origin': ORIGIN }
            });
            fullResponse = response.data || {};
            externalContratistas = fullResponse.contratistas || [];
        } catch (e) {
            console.warn('⚠️ No se pudo obtener la API externa para enriquecer nombres de contratistas:', e.message);
        }
        const { resolveContractor } = buildContractorLookups(externalContratistas);

        // Helper synchronization functions defined inside transaction scope
        const syncGerencias = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            for (const item of itemsList) {
                await Gerencia.findOrCreate({
                    where: { nombre: item.nombre },
                    transaction
                });
            }
        };

        const syncSubgerencias = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            // Pre-sync parent gerencias first
            const parentGerencias = [];
            const seenGerencias = new Set();
            for (const item of itemsList) {
                const gName = item.gerencia || 'GERENCIA GENERAL';
                const normG = normalize(gName);
                if (!seenGerencias.has(normG)) {
                    seenGerencias.add(normG);
                    parentGerencias.push({ nombre: gName });
                }
            }
            await syncGerencias(parentGerencias);

            for (const item of itemsList) {
                const gName = item.gerencia || 'GERENCIA GENERAL';
                const gerencia = await Gerencia.findOne({ where: { nombre: gName }, transaction });
                await Subgerencia.findOrCreate({
                    where: { nombre: item.nombre, gerencia_id: gerencia.id },
                    transaction
                });
            }
        };

        const syncServicios = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            // Pre-sync parent subgerencias first
            const parentSubgerencias = [];
            const seenSubgerencias = new Set();
            for (const item of itemsList) {
                const sName = item.subgerencia || 'SUBGERENCIA GENERAL';
                const gName = item.gerencia || 'GERENCIA GENERAL';
                const key = normalize(gName + '|' + sName);
                if (!seenSubgerencias.has(key)) {
                    seenSubgerencias.add(key);
                    parentSubgerencias.push({ nombre: sName, gerencia: gName });
                }
            }
            await syncSubgerencias(parentSubgerencias);

            for (const item of itemsList) {
                const sName = item.subgerencia || 'SUBGERENCIA GENERAL';
                const subgerencia = await Subgerencia.findOne({ where: { nombre: sName }, transaction });
                await TipoContratista.findOrCreate({
                    where: { nombre: item.nombre, subgerencia_id: subgerencia.id },
                    defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                    transaction
                });
            }
        };

        const syncDependencias = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            for (const item of itemsList) {
                await Dependencia.findOrCreate({
                    where: { nombre: item.nombre },
                    defaults: { activo: 1 },
                    transaction
                });
            }
        };

        const syncContratistas = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            for (const item of itemsList) {
                const rawRut = item.rut;
                if (rawRut) {
                    const resolved = resolveContractor(rawRut, item.nombre);
                    const cleanResolvedRut = cleanRutString(resolved.rut);

                    let contractor = await Contratista.findOne({
                        where: { rut: resolved.rut },
                        transaction
                    });

                    if (!contractor) {
                        // Try clean lookup or find without DV
                        const allLocal = await Contratista.findAll({ transaction });
                        contractor = allLocal.find(c => {
                            const localClean = cleanRutString(c.rut);
                            return localClean === cleanResolvedRut || (localClean.length >= 8 && localClean.slice(0, -1) === cleanResolvedRut.slice(0, -1));
                        });
                    }

                    if (!contractor) {
                        contractor = await Contratista.create({
                            rut: resolved.rut,
                            nombre: resolved.nombre,
                            activo: 1
                        }, { transaction });
                    } else {
                        if (resolved.nombre && contractor.nombre !== resolved.nombre && resolved.nombre !== resolved.rut) {
                            await contractor.update({ nombre: resolved.nombre }, { transaction });
                        }
                    }
                }
            }
        };

        const syncContratistaAdmins = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            // Gather complete list of RUTs per admin email from external response as a source of truth
            const extAdminEmailToRuts = new Map();
            if (fullResponse.contratista_admin) {
                fullResponse.contratista_admin.forEach(admin => {
                    if (admin.email) {
                        const emailNorm = normalize(admin.email);
                        const resolved = resolveContractor(admin.rut_contratista);
                        if (!extAdminEmailToRuts.has(emailNorm)) {
                            extAdminEmailToRuts.set(emailNorm, new Set());
                        }
                        extAdminEmailToRuts.get(emailNorm).add(resolved.rut);
                    }
                });
            }
            if (Array.isArray(externalContratistas)) {
                externalContratistas.forEach(c => {
                    let rawRut = c.rut;
                    if (!rawRut && c.cot_rut) {
                        rawRut = `${c.cot_rut}-${c.cot_dv}`;
                    }
                    if (!rawRut) return;
                    const resolvedC = resolveContractor(rawRut);

                    const admins = c.contratista_admin || (c.data && c.data.contratista_admin);
                    if (admins && Array.isArray(admins)) {
                        admins.forEach(admin => {
                            if (admin.email) {
                                const emailNorm = normalize(admin.email);
                                if (!extAdminEmailToRuts.has(emailNorm)) {
                                    extAdminEmailToRuts.set(emailNorm, new Set());
                                }
                                extAdminEmailToRuts.get(emailNorm).add(resolvedC.rut);
                            }
                        });
                    }
                });
            }

            // Pre-sync parent contratistas first
            const parentContratistas = [];
            const seenContratistas = new Set();
            for (const item of itemsList) {
                const emailNorm = normalize(item.email);
                const extRutsSet = extAdminEmailToRuts.get(emailNorm);
                const ruts = extRutsSet ? Array.from(extRutsSet) : (item.rut_contratistas || [item.rut_contratista || '99999999-9']);
                for (const cRut of ruts) {
                    const resolved = resolveContractor(cRut, item.contratista);
                    const normC = normalize(resolved.rut);
                    if (!seenContratistas.has(normC)) {
                        seenContratistas.add(normC);
                        parentContratistas.push({ rut: resolved.rut, nombre: resolved.nombre });
                    }
                }
            }
            await syncContratistas(parentContratistas);

            for (const item of itemsList) {
                if (!item.email) continue;
                const emailNorm = normalize(item.email);
                const extRutsSet = extAdminEmailToRuts.get(emailNorm);
                const ruts = extRutsSet ? Array.from(extRutsSet) : (item.rut_contratistas || [item.rut_contratista || '99999999-9']);

                const allLocal = await Contratista.findAll({ transaction });
                const associatedContratistas = [];

                for (const cRut of ruts) {
                    const resolved = resolveContractor(cRut, item.contratista);
                    const cleanResolvedRut = cleanRutString(resolved.rut);
                    const contratista = allLocal.find(c => cleanRutString(c.rut) === cleanResolvedRut);
                    if (contratista && !associatedContratistas.some(c => c.id === contratista.id)) {
                        associatedContratistas.push(contratista);
                    }
                }

                if (associatedContratistas.length > 0) {
                    const primaryContratista = associatedContratistas[0];
                    const [user, created] = await User.findOrCreate({
                        where: { email: item.email },
                        defaults: {
                            name: item.nombre || item.email.split('@')[0] || 'Administrador Contratista',
                            password: defaultPasswordHash,
                            role: 'contratista_admin',
                            contratista_id: primaryContratista.id,
                            activo: 1
                        },
                        transaction
                    });

                    // If user already exists, update role, primary company, active status, and name if necessary
                    if (!created) {
                        const updateFields = {};
                        if (user.role !== 'contratista_admin' && user.role !== 'admin' && user.role !== 'administrador_contrato') {
                            updateFields.role = 'contratista_admin';
                        }
                        if (user.contratista_id !== primaryContratista.id) updateFields.contratista_id = primaryContratista.id;
                        if (user.activo !== 1) updateFields.activo = 1;
                        if (item.nombre && user.name !== item.nombre) updateFields.name = item.nombre;
                        
                        if (Object.keys(updateFields).length > 0) {
                            await user.update(updateFields, { transaction });
                        }
                    }

                    // Associate all resolved contractors in the pivot table
                    const associatedIds = associatedContratistas.map(c => c.id);
                    for (const cId of associatedIds) {
                        await ContratistaUsuario.findOrCreate({
                            where: {
                                user_id: user.id,
                                contratista_id: cId
                            },
                            transaction
                        });
                    }

                    // Clean up any other companies they are no longer admin of
                    await ContratistaUsuario.destroy({
                        where: {
                            user_id: user.id,
                            contratista_id: { [sequelize.Sequelize.Op.notIn]: associatedIds }
                        },
                        transaction
                    });
                }
            }
        };

        const syncVinculaciones = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            // 1. Gather all parent relations for batch sync
            const parentGerencias = [];
            const parentSubgerencias = [];
            const parentServicios = [];
            const parentDependencias = [];
            const parentContratistas = [];

            const seenG = new Set();
            const seenSG = new Set();
            const seenS = new Set();
            const seenD = new Set();
            const seenC = new Set();

            for (const item of itemsList) {
                const gName = item.gerencia || 'GERENCIA GENERAL';
                const sgName = item.subgerencia || 'SUBGERENCIA GENERAL';
                const sName = item.servicio || 'SERVICIOS GENERALES';
                const dName = item.dependencia || 'OFICINA CENTRAL';
                const cRut = item.rut_contratista || '99999999-9';

                const resolved = resolveContractor(cRut, item.contratista);

                if (!seenG.has(normalize(gName))) {
                    seenG.add(normalize(gName));
                    parentGerencias.push({ nombre: gName });
                }
                if (!seenSG.has(normalize(gName + '|' + sgName))) {
                    seenSG.add(normalize(gName + '|' + sgName));
                    parentSubgerencias.push({ nombre: sgName, gerencia: gName });
                }
                if (!seenS.has(normalize(sgName + '|' + sName))) {
                    seenS.add(normalize(sgName + '|' + sName));
                    parentServicios.push({ nombre: sName, subgerencia: sgName, gerencia: gName });
                }
                if (!seenD.has(normalize(dName))) {
                    seenD.add(normalize(dName));
                    parentDependencias.push({ nombre: dName });
                }
                if (!seenC.has(normalize(resolved.rut))) {
                    seenC.add(normalize(resolved.rut));
                    parentContratistas.push({ rut: resolved.rut, nombre: resolved.nombre });
                }
            }

            // Sync all parent batches sequentially
            await syncGerencias(parentGerencias);
            await syncSubgerencias(parentSubgerencias);
            await syncServicios(parentServicios);
            await syncDependencias(parentDependencias);
            await syncContratistas(parentContratistas);

            // 2. Perform main vinculación sync loop
            for (const item of itemsList) {
                const gName = item.gerencia || 'GERENCIA GENERAL';
                const sgName = item.subgerencia || 'SUBGERENCIA GENERAL';
                const sName = item.servicio || 'SERVICIOS GENERALES';
                const dName = item.dependencia || 'OFICINA CENTRAL';
                const cRut = item.rut_contratista || '99999999-9';

                const resolved = resolveContractor(cRut, item.contratista);

                const gerencia = await Gerencia.findOne({ where: { nombre: gName }, transaction });
                const subgerencia = await Subgerencia.findOne({ where: { nombre: sgName, gerencia_id: gerencia.id }, transaction });
                const servicio = await TipoContratista.findOne({ where: { nombre: sName, subgerencia_id: subgerencia.id }, transaction });
                const dependencia = await Dependencia.findOne({ where: { nombre: dName }, transaction });
                
                // Find contractor using clean resolved RUT lookup
                const cleanResolvedRut = cleanRutString(resolved.rut);
                const allLocal = await Contratista.findAll({ transaction });
                const contratista = allLocal.find(c => cleanRutString(c.rut) === cleanResolvedRut);

                if (!contratista) {
                    throw new Error(`Contratista con RUT ${resolved.rut} no pudo ser creado/encontrado.`);
                }

                const fallbackContrato = item.numero_contrato || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}-${dependencia.id}-${Math.floor(1000 + Math.random() * 9000)}`;
                
                let uniqueContrato = fallbackContrato;
                let existsContrato = await Vinculacion.findOne({ where: { numero_contrato: uniqueContrato }, transaction });
                let attempts = 0;
                while (existsContrato && attempts < 10) {
                    uniqueContrato = `${fallbackContrato}-${dependencia.id}-${Math.floor(100 + Math.random() * 900)}`;
                    existsContrato = await Vinculacion.findOne({ where: { numero_contrato: uniqueContrato }, transaction });
                    attempts++;
                }

                const [vinculacion, created] = await Vinculacion.findOrCreate({
                    where: {
                        contratista_id: contratista.id,
                        servicio_id: servicio.id,
                        dependencia_id: dependencia.id,
                        subgerencia_id: subgerencia.id,
                        gerencia_id: gerencia.id
                    },
                    defaults: {
                        activo: 1,
                        numero_contrato: uniqueContrato,
                        fecha_inicio_contrato: item.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        fecha_termino_contrato: item.fecha_termino_contrato || null
                    },
                    transaction
                });

                if (!created) {
                    const updateData = {};
                    if (item.numero_contrato && normalize(vinculacion.numero_contrato) !== normalize(item.numero_contrato)) {
                        updateData.numero_contrato = item.numero_contrato;
                    }
                    if (item.fecha_inicio_contrato && vinculacion.fecha_inicio_contrato !== item.fecha_inicio_contrato) updateData.fecha_inicio_contrato = item.fecha_inicio_contrato;
                    if (item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== item.fecha_termino_contrato) updateData.fecha_termino_contrato = item.fecha_termino_contrato;
                    else if (!item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== null) updateData.fecha_termino_contrato = null;

                    if (Object.keys(updateData).length > 0) {
                        await vinculacion.update(updateData, { transaction });
                    }
                }
            }
        };

        const syncAdministradoresContrato = async (itemsList) => {
            if (!itemsList || itemsList.length === 0) return;
            // 1. Gather and resolve all parent relations for batch sync
            const parentGerencias = [];
            const parentSubgerencias = [];
            const parentServicios = [];
            const parentDependencias = [];
            const parentContratistas = [];

            const seenG = new Set();
            const seenSG = new Set();
            const seenS = new Set();
            const seenD = new Set();
            const seenC = new Set();

            for (const item of itemsList) {
                if (item.asignaciones && Array.isArray(item.asignaciones)) {
                    for (const asig of item.asignaciones) {
                        let gerenciaName = asig.gerencia;
                        let subgerenciaName = asig.subgerencia;
                        let servicioName = asig.servicio;
                        let dependenciaName = asig.dependencia;
                        let rutContratista = asig.rut_contratista;

                        if (!gerenciaName && subgerenciaName) {
                            const subInDb = await Subgerencia.findOne({
                                where: { nombre: subgerenciaName },
                                include: [{ model: Gerencia, as: 'gerencia' }],
                                transaction
                            });
                            if (subInDb && subInDb.gerencia) {
                                gerenciaName = subInDb.gerencia.nombre;
                            }
                        }

                        if (!subgerenciaName && servicioName) {
                            const servInDb = await TipoContratista.findOne({
                                where: { nombre: servicioName },
                                include: [{ model: Subgerencia, as: 'subgerencia' }],
                                transaction
                            });
                            if (servInDb && servInDb.subgerencia) {
                                subgerenciaName = servInDb.subgerencia.nombre;
                                if (!gerenciaName) {
                                    const gerInDb = await Gerencia.findByPk(servInDb.subgerencia.gerencia_id, { transaction });
                                    if (gerInDb) gerenciaName = gerInDb.nombre;
                                }
                            }
                        }

                        if (!gerenciaName) gerenciaName = 'GERENCIA GENERAL';
                        if (!subgerenciaName) subgerenciaName = 'SUBGERENCIA GENERAL';
                        if (!servicioName) servicioName = 'SERVICIOS GENERALES';
                        if (!dependenciaName) dependenciaName = 'OFICINA CENTRAL';
                        if (!rutContratista) rutContratista = '99999999-9';

                        const resolved = resolveContractor(rutContratista, asig.contratista);

                        asig.resolvedGerencia = gerenciaName;
                        asig.resolvedSubgerencia = subgerenciaName;
                        asig.resolvedServicio = servicioName;
                        asig.resolvedDependencia = dependenciaName;
                        asig.resolvedRutContratista = resolved.rut;
                        asig.resolvedContratistaNombre = resolved.nombre;

                        if (!seenG.has(normalize(gerenciaName))) {
                            seenG.add(normalize(gerenciaName));
                            parentGerencias.push({ nombre: gerenciaName });
                        }
                        if (!seenSG.has(normalize(gerenciaName + '|' + subgerenciaName))) {
                            seenSG.add(normalize(gerenciaName + '|' + subgerenciaName));
                            parentSubgerencias.push({ nombre: subgerenciaName, gerencia: gerenciaName });
                        }
                        if (!seenS.has(normalize(subgerenciaName + '|' + servicioName))) {
                            seenS.add(normalize(subgerenciaName + '|' + servicioName));
                            parentServicios.push({ nombre: servicioName, subgerencia: subgerenciaName, gerencia: gerenciaName });
                        }
                        if (!seenD.has(normalize(dependenciaName))) {
                            seenD.add(normalize(dependenciaName));
                            parentDependencias.push({ nombre: dependenciaName });
                        }
                        if (!seenC.has(normalize(resolved.rut))) {
                            seenC.add(normalize(resolved.rut));
                            parentContratistas.push({ rut: resolved.rut, nombre: resolved.nombre });
                        }
                    }
                }
            }

            // Sync all parent batches sequentially
            await syncGerencias(parentGerencias);
            await syncSubgerencias(parentSubgerencias);
            await syncServicios(parentServicios);
            await syncDependencias(parentDependencias);
            await syncContratistas(parentContratistas);

            // 2. Perform main administrador_contrato sync loop
            for (const item of itemsList) {
                if (!item.email) continue;
                const [user, created] = await User.findOrCreate({
                    where: { email: item.email },
                    defaults: {
                        name: item.nombre || item.email.split('@')[0] || 'Administrador de Contrato',
                        password: defaultPasswordHash,
                        role: 'administrador_contrato',
                        activo: 1
                    },
                    transaction
                });

                if (!created && user.role !== 'administrador_contrato' && user.role !== 'admin') {
                    await user.update({ role: 'administrador_contrato' }, { transaction });
                }

                const syncedVinculacionIds = [];

                if (item.asignaciones && Array.isArray(item.asignaciones)) {
                    for (const asig of item.asignaciones) {
                        const gerencia = await Gerencia.findOne({ where: { nombre: asig.resolvedGerencia }, transaction });
                        const subgerencia = await Subgerencia.findOne({ where: { nombre: asig.resolvedSubgerencia, gerencia_id: gerencia.id }, transaction });
                        const servicio = await TipoContratista.findOne({ where: { nombre: asig.resolvedServicio, subgerencia_id: subgerencia.id }, transaction });
                        const dependencia = await Dependencia.findOne({ where: { nombre: asig.resolvedDependencia }, transaction });
                        
                        // Find contractor using clean resolved RUT lookup
                        const cleanResolvedRut = cleanRutString(asig.resolvedRutContratista);
                        const allLocal = await Contratista.findAll({ transaction });
                        const contratista = allLocal.find(c => cleanRutString(c.rut) === cleanResolvedRut);

                        if (!contratista) {
                            throw new Error(`Contratista con RUT ${asig.resolvedRutContratista} no pudo ser creado/encontrado.`);
                        }

                        const fallbackContrato = asig.contrato || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}-${dependencia.id}-${Math.floor(1000 + Math.random() * 9000)}`;
                        
                        let uniqueContrato = fallbackContrato;
                        let existsContrato = await Vinculacion.findOne({ where: { numero_contrato: uniqueContrato }, transaction });
                        let attempts = 0;
                        while (existsContrato && attempts < 10) {
                            uniqueContrato = `${fallbackContrato}-${dependencia.id}-${Math.floor(100 + Math.random() * 900)}`;
                            existsContrato = await Vinculacion.findOne({ where: { numero_contrato: uniqueContrato }, transaction });
                            attempts++;
                        }

                        const [vinculacion, vincCreated] = await Vinculacion.findOrCreate({
                            where: {
                                contratista_id: contratista.id,
                                servicio_id: servicio.id,
                                dependencia_id: dependencia.id,
                                subgerencia_id: subgerencia.id,
                                gerencia_id: gerencia.id
                            },
                            defaults: {
                                activo: 1,
                                numero_contrato: uniqueContrato
                            },
                            transaction
                        });

                        if (!vincCreated) {
                            const updateData = {};
                            if (vinculacion.activo !== 1) updateData.activo = 1;
                            if (asig.contrato && normalize(vinculacion.numero_contrato) !== normalize(asig.contrato)) {
                                updateData.numero_contrato = asig.contrato;
                            }
                            if (Object.keys(updateData).length > 0) {
                                await vinculacion.update(updateData, { transaction });
                            }
                        }

                        syncedVinculacionIds.push(vinculacion.id);

                        const [adminAssoc, adminAssocCreated] = await Administracion.findOrCreate({
                            where: {
                                vinculacion_id: vinculacion.id,
                                administrador_contrato_id: user.id
                            },
                            defaults: { activo: 1 },
                            transaction
                        });

                        if (!adminAssocCreated && adminAssoc.activo !== 1) {
                            await adminAssoc.update({ activo: 1 }, { transaction });
                        }
                    }
                }

                // Deactivate any other assignments that are not present in this synchronization
                await Administracion.update(
                    { activo: 0 },
                    {
                        where: {
                            administrador_contrato_id: user.id,
                            vinculacion_id: { [sequelize.Sequelize.Op.notIn]: syncedVinculacionIds }
                        },
                        transaction
                    }
                );
            }
        };

        if (type === 'gerencias') {
            await syncGerencias(items);
        } else if (type === 'subgerencias') {
            await syncSubgerencias(items);
        } else if (type === 'servicios') {
            await syncServicios(items);
        } else if (type === 'dependencias') {
            await syncDependencias(items);
        } else if (type === 'contratistas') {
            // First sync the selected contractors
            await syncContratistas(items);

            // Now, find and sync the "complete pack" for each contractor
            // Gather all associated vinculaciones, contratista_admins, and administrador_contratos
            const associatedVinculaciones = [];
            const associatedContratistaAdmins = [];
            const associatedAdministradoresContrato = [];

            const subgerenciaToGerenciaMap = new Map();
            const localSubgerenciasForMap = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
            localSubgerenciasForMap.forEach(s => {
                if (s.nombre && s.gerencia && s.gerencia.nombre) {
                    subgerenciaToGerenciaMap.set(normalize(s.nombre), s.gerencia.nombre);
                }
            });

            // Populate mapping from fullResponse.subgerencias if present
            if (Array.isArray(fullResponse.subgerencias)) {
                fullResponse.subgerencias.forEach(s => {
                    if (s && s.nombre && s.gerencia) {
                        subgerenciaToGerenciaMap.set(normalize(s.nombre), s.gerencia);
                    }
                });
            }

            for (const item of items) {
                const targetRutClean = cleanRutString(item.rut);
                if (!targetRutClean) continue;

                // 1. From top-level fullResponse.vinculaciones
                if (Array.isArray(fullResponse.vinculaciones)) {
                    fullResponse.vinculaciones.forEach(v => {
                        if (v) {
                            const resolved = resolveContractor(v.rut_contratista);
                            if (cleanRutString(resolved.rut) === targetRutClean) {
                                associatedVinculaciones.push({
                                    rut_contratista: resolved.rut,
                                    servicio: normalize(v.servicio),
                                    dependencia: normalize(v.dependencia),
                                    subgerencia: normalize(v.subgerencia),
                                    gerencia: normalize(v.gerencia),
                                    numero_contrato: v.numero_contrato || null,
                                    fecha_inicio_contrato: v.fecha_inicio_contrato || null,
                                    fecha_termino_contrato: v.fecha_termino_contrato || null,
                                    contratista: resolved.nombre
                                });
                            }
                        }
                    });
                }

                // 2. From top-level fullResponse.contratista_admin
                if (Array.isArray(fullResponse.contratista_admin)) {
                    fullResponse.contratista_admin.forEach(admin => {
                        if (admin && admin.email) {
                            const resolved = resolveContractor(admin.rut_contratista);
                            if (cleanRutString(resolved.rut) === targetRutClean) {
                                // Find if already in the list to avoid duplicate admin structures
                                const exists = associatedContratistaAdmins.some(a => normalize(a.email) === normalize(admin.email));
                                if (!exists) {
                                    associatedContratistaAdmins.push({
                                        nombre: admin.nombre,
                                        email: admin.email,
                                        rut_contratista: resolved.rut,
                                        rut_contratistas: [resolved.rut]
                                    });
                                } else {
                                    const match = associatedContratistaAdmins.find(a => normalize(a.email) === normalize(admin.email));
                                    if (match && !match.rut_contratistas.includes(resolved.rut)) {
                                        match.rut_contratistas.push(resolved.rut);
                                    }
                                }
                            }
                        }
                    });
                }

                // 3. From top-level fullResponse.administrador_contrato
                if (Array.isArray(fullResponse.administrador_contrato)) {
                    fullResponse.administrador_contrato.forEach(admin => {
                        if (admin && admin.email && admin.asignaciones && Array.isArray(admin.asignaciones)) {
                            const matches = admin.asignaciones.some(asig => {
                                const resolved = resolveContractor(asig.rut_contratista || asig.cot_rut);
                                return cleanRutString(resolved.rut) === targetRutClean;
                            });

                            if (matches) {
                                const formattedAsigs = admin.asignaciones.map(asig => {
                                    const resolved = resolveContractor(asig.rut_contratista || asig.cot_rut);
                                    return {
                                        rut_contratista: resolved.rut,
                                        servicio: normalize(asig.servicio),
                                        dependencia: normalize(asig.dependencia),
                                        subgerencia: normalize(asig.subgerencia),
                                        gerencia: normalize(asig.gerencia),
                                        contrato: asig.contrato || asig.numero_contrato || null,
                                        contratista: resolved.nombre
                                    };
                                });

                                const exists = associatedAdministradoresContrato.some(a => normalize(a.email) === normalize(admin.email));
                                if (!exists) {
                                    associatedAdministradoresContrato.push({
                                        nombre: admin.nombre,
                                        email: admin.email,
                                        asignaciones: formattedAsigs
                                    });
                                }
                            }
                        }
                    });
                }

                // 4. From legacy/backup structure in externalContratistas (which is fullResponse.contratistas)
                if (Array.isArray(externalContratistas)) {
                    externalContratistas.forEach(c => {
                        if (!c) return;
                        let rawRut = c.rut;
                        if (!rawRut && c.cot_rut) {
                            rawRut = `${c.cot_rut}-${c.cot_dv}`;
                        }
                        if (!rawRut) return;

                        const resolved = resolveContractor(rawRut, c.nombre || c.cot_razon_social);
                        if (cleanRutString(resolved.rut) === targetRutClean) {
                            // Extract nested admins
                            const admins = c.contratista_admin || (c.data && c.data.contratista_admin);
                            if (admins && Array.isArray(admins)) {
                                admins.forEach(admin => {
                                    if (admin && admin.email) {
                                        const exists = associatedContratistaAdmins.some(a => normalize(a.email) === normalize(admin.email));
                                        if (!exists) {
                                            associatedContratistaAdmins.push({
                                                nombre: admin.nombre,
                                                email: admin.email,
                                                rut_contratista: resolved.rut,
                                                rut_contratistas: [resolved.rut]
                                            });
                                        } else {
                                            const match = associatedContratistaAdmins.find(a => normalize(a.email) === normalize(admin.email));
                                            if (match && !match.rut_contratistas.includes(resolved.rut)) {
                                                match.rut_contratistas.push(resolved.rut);
                                            }
                                        }
                                    }
                                });
                            }

                            // Extract nested asignaciones
                            const asigs = c.asignaciones || (c.data && c.data.asignaciones);
                            if (asigs && Array.isArray(asigs)) {
                                asigs.forEach(a => {
                                    if (a && a.servicio && a.dependencia && a.subgerencia) {
                                        const gerenciaName = a.gerencia || subgerenciaToGerenciaMap.get(normalize(a.subgerencia)) || 'GERENCIA GENERAL';
                                        
                                        // Avoid duplicate vinculaciones in our list
                                        const alreadyAdded = associatedVinculaciones.some(v =>
                                            cleanRutString(v.rut_contratista) === targetRutClean &&
                                            normalize(v.servicio) === normalize(a.servicio) &&
                                            normalize(v.dependencia) === normalize(a.dependencia) &&
                                            normalize(v.subgerencia) === normalize(a.subgerencia) &&
                                            normalize(v.gerencia) === normalize(gerenciaName)
                                        );

                                        if (!alreadyAdded) {
                                            associatedVinculaciones.push({
                                                rut_contratista: resolved.rut,
                                                servicio: normalize(a.servicio),
                                                dependencia: normalize(a.dependencia),
                                                subgerencia: normalize(a.subgerencia),
                                                gerencia: normalize(gerenciaName),
                                                numero_contrato: a.contrato || null,
                                                fecha_inicio_contrato: a.fecha_inicio || null,
                                                fecha_termino_contrato: a.fecha_termino || null,
                                                contratista: resolved.nombre
                                            });
                                        }

                                        // Extract nested administrators
                                        const adminList = a.administradores_contrato || a.administrador_contrato;
                                        if (adminList && Array.isArray(adminList)) {
                                            adminList.forEach(admin => {
                                                if (!admin) return;
                                                const email = admin.email || (typeof admin === 'string' && admin.includes('@') ? admin : null);
                                                const nombre = admin.nombre || (typeof admin === 'string' ? admin : null);
                                                
                                                if (email) {
                                                    const key = normalize(email);
                                                    const exists = associatedAdministradoresContrato.some(o => normalize(o.email) === key);
                                                    if (!exists) {
                                                        associatedAdministradoresContrato.push({
                                                            nombre: nombre || email.split('@')[0],
                                                            email: email,
                                                            asignaciones: [{
                                                                rut_contratista: resolved.rut,
                                                                servicio: normalize(a.servicio),
                                                                dependencia: normalize(a.dependencia),
                                                                subgerencia: normalize(a.subgerencia),
                                                                gerencia: normalize(gerenciaName),
                                                                contrato: a.contrato || null,
                                                                contratista: resolved.nombre
                                                            }]
                                                        });
                                                    } else {
                                                        const match = associatedAdministradoresContrato.find(o => normalize(o.email) === key);
                                                        if (match) {
                                                            const alreadyHasAsig = match.asignaciones.some(oldAsig =>
                                                                cleanRutString(oldAsig.rut_contratista) === targetRutClean &&
                                                                normalize(oldAsig.servicio) === normalize(a.servicio) &&
                                                                normalize(oldAsig.dependencia) === normalize(a.dependencia) &&
                                                                normalize(oldAsig.subgerencia) === normalize(a.subgerencia) &&
                                                                normalize(oldAsig.gerencia) === normalize(gerenciaName)
                                                            );
                                                            if (!alreadyHasAsig) {
                                                                match.asignaciones.push({
                                                                    rut_contratista: resolved.rut,
                                                                    servicio: normalize(a.servicio),
                                                                    dependencia: normalize(a.dependencia),
                                                                    subgerencia: normalize(a.subgerencia),
                                                                    gerencia: normalize(gerenciaName),
                                                                    contrato: a.contrato || null,
                                                                    contratista: resolved.nombre
                                                                });
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            }

            // Sync all associated entities:
            // 1. Vinculaciones (which automatically syncs parent gerencias, subgerencias, servicios, dependencias, and contractor)
            await syncVinculaciones(associatedVinculaciones);
            // 2. Contratista Admins
            await syncContratistaAdmins(associatedContratistaAdmins);
            // 3. Administradores de Contrato (which automatically links them in Administracion table)
            await syncAdministradoresContrato(associatedAdministradoresContrato);

        } else if (type === 'contratista_admin') {
            await syncContratistaAdmins(items);
        } else if (type === 'vinculaciones') {
            await syncVinculaciones(items);
        } else if (type === 'administrador_contrato') {
            await syncAdministradoresContrato(items);
        }

        await transaction.commit();
        res.json({ success: true, message: `Synced ${items.length} items.` });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in syncData:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
};

module.exports = { compareData, syncData };
