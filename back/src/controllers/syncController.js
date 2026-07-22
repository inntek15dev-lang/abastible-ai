const axios = require('axios');
const bcrypt = require('bcryptjs');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion, User, Administracion, Gerencia, Subgerencia, ContratistaUsuario } = require('../database/models');

const isProduction = process.env.NODE_ENV === 'production';
const defaultPizzaUrl = isProduction
    ? 'https://ovalcontrol.com/api/getContratistasAbastible'
    : 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';

let EXTERNAL_API_URL = process.env.PIZZA_API_URL || defaultPizzaUrl;

// Sanitize environment variables to remove potential whitespace/carriage returns
EXTERNAL_API_URL = EXTERNAL_API_URL.trim().replace(/\r$/, '');

// Guardrail: Production environment must NEVER call the preproduction API
if (isProduction && EXTERNAL_API_URL.includes('prepro')) {
    console.warn('⚠️ WARNING: PIZZA_API_URL was set to a preproduction URL in production. Forcing production URL.');
    EXTERNAL_API_URL = 'https://ovalcontrol.com/api/getContratistasAbastible';
}

// Guardrail: Preproduction/development must NOT call the production API to avoid data contamination
if (!isProduction && !EXTERNAL_API_URL.includes('prepro') && EXTERNAL_API_URL.includes('ovalcontrol.com')) {
    console.warn('⚠️ WARNING: PIZZA_API_URL was set to a production URL in a non-production environment. Forcing preprod URL.');
    EXTERNAL_API_URL = 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';
}

const API_KEY = process.env.PIZZA_API_KEY ? process.env.PIZZA_API_KEY.trim().replace(/\r$/, '') : undefined;
const ORIGIN = process.env.ORIGIN ? process.env.ORIGIN.trim().replace(/\r$/, '') : undefined;

const sanitizeString = (str) => {
    if (str === null || str === undefined) return '';
    return str.toString().replace(/[\u00A0\u200B\r\n\t]/g, ' ').trim();
};

const sanitizeEmail = (email) => {
    if (!email) return '';
    return sanitizeString(email).toLowerCase();
};

const normalize = (str) => {
    if (str === null || str === undefined) return '';
    return sanitizeString(str).toUpperCase();
};

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
                timeout: 30000 // 30s timeout
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
                            usu_id: admin.usu_id || null,
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
                            usu_id: admin.usu_id || null,
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
    try {
        const { type, items } = req.body;
        console.log(`📥 Syncing ${items ? items.length : 0} items of type ${type}...`);

        if (!Array.isArray(items)) throw new Error('Invalid items format');

        const defaultPasswordHash = await bcrypt.hash('User123*', 10);

        // Fetch external data for enrichment
        let externalContratistas = [];
        let fullResponse = {};
        try {
            const response = await axios.get(EXTERNAL_API_URL, {
                headers: { 'api-key': API_KEY, 'Origin': ORIGIN },
                timeout: 30000
            });
            fullResponse = response.data || {};
            externalContratistas = fullResponse.contratistas || [];
        } catch (e) {
            console.warn('⚠️ No se pudo obtener la API externa para enriquecer nombres de contratistas:', e.message);
        }
        const { resolveContractor } = buildContractorLookups(externalContratistas);

        const syncedItems = [];
        const failedItems = [];

        // Helper to execute single item sync inside an isolated transaction
        const processGranularItem = async (item, handlerFn) => {
            const transaction = await sequelize.transaction();
            try {
                const result = await handlerFn(item, transaction);
                await transaction.commit();
                syncedItems.push(result || item);
            } catch (err) {
                await transaction.rollback();
                console.warn(`⚠️ Granular sync warning on item (${JSON.stringify(item.rut || item.nombre || item.email || item).slice(0, 100)}):`, err.message);
                failedItems.push({
                    item: item,
                    error: err.message,
                    details: err.original?.message || err.errors?.map(e => e.message).join(', ') || err.message
                });
            }
        };

        // Granular helper sync implementations per entity
        const syncSingleGerencia = async (item, transaction) => {
            const gName = sanitizeString(item.nombre) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({
                where: { nombre: gName },
                transaction
            });
            return gerencia;
        };

        const syncSingleSubgerencia = async (item, transaction) => {
            const sName = sanitizeString(item.nombre) || 'SUBGERENCIA GENERAL';
            const gName = sanitizeString(item.gerencia) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            const [subgerencia] = await Subgerencia.findOrCreate({
                where: { nombre: sName, gerencia_id: gerencia.id },
                transaction
            });
            return subgerencia;
        };

        const syncSingleServicio = async (item, transaction) => {
            const servName = sanitizeString(item.nombre || item.servicio) || 'SERVICIOS GENERALES';
            const sName = sanitizeString(item.subgerencia) || 'SUBGERENCIA GENERAL';
            const gName = sanitizeString(item.gerencia) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sName, gerencia_id: gerencia.id }, transaction });
            const [servicio] = await TipoContratista.findOrCreate({
                where: { nombre: servName, subgerencia_id: subgerencia.id },
                defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                transaction
            });
            return servicio;
        };

        const syncSingleDependencia = async (item, transaction) => {
            const dName = sanitizeString(item.nombre) || 'OFICINA CENTRAL';
            const [dependencia] = await Dependencia.findOrCreate({
                where: { nombre: dName },
                defaults: { activo: 1 },
                transaction
            });
            return dependencia;
        };

        const syncSingleContratista = async (item, transaction) => {
            const rawRut = sanitizeString(item.rut || (item.cot_rut ? `${item.cot_rut}-${item.cot_dv}` : ''));
            const rawNombre = sanitizeString(item.nombre || item.cot_razon_social);
            if (!rawRut) throw new Error('RUT de contratista inválido o no provisto.');
            
            const resolved = resolveContractor(rawRut, rawNombre);
            const cleanResolvedRut = cleanRutString(resolved.rut);

            let contractor = await Contratista.findOne({
                where: { rut: resolved.rut },
                transaction
            });

            if (!contractor) {
                const allLocal = await Contratista.findAll({ transaction });
                contractor = allLocal.find(c => {
                    const localClean = cleanRutString(c.rut);
                    return localClean === cleanResolvedRut || (localClean.length >= 8 && localClean.slice(0, -1) === cleanResolvedRut.slice(0, -1));
                });
            }

            if (!contractor) {
                contractor = await Contratista.create({
                    rut: resolved.rut,
                    nombre: sanitizeString(resolved.nombre) || resolved.rut,
                    activo: 1
                }, { transaction });
            } else {
                if (resolved.nombre && contractor.nombre !== resolved.nombre && resolved.nombre !== resolved.rut) {
                    await contractor.update({ nombre: sanitizeString(resolved.nombre) }, { transaction });
                }
            }
            return contractor;
        };

        const syncSingleContratistaAdmin = async (item, transaction, extAdminEmailToRuts = null) => {
            const cleanEmail = sanitizeEmail(item.email);
            if (!cleanEmail) throw new Error('Email de administrador contratista es requerido.');

            const emailNorm = normalize(cleanEmail);
            const extRutsSet = extAdminEmailToRuts ? extAdminEmailToRuts.get(emailNorm) : null;
            const ruts = extRutsSet ? Array.from(extRutsSet) : (item.rut_contratistas || [item.rut_contratista || '99999999-9']);

            const allLocal = await Contratista.findAll({ transaction });
            const associatedContratistas = [];

            for (const cRut of ruts) {
                const resolved = resolveContractor(sanitizeString(cRut), item.contratista);
                const cleanResolvedRut = cleanRutString(resolved.rut);
                let contratista = allLocal.find(c => cleanRutString(c.rut) === cleanResolvedRut);

                if (!contratista) {
                    contratista = await Contratista.create({
                        rut: resolved.rut,
                        nombre: sanitizeString(resolved.nombre) || resolved.rut,
                        activo: 1
                    }, { transaction });
                }

                if (contratista && !associatedContratistas.some(c => c.id === contratista.id)) {
                    associatedContratistas.push(contratista);
                }
            }

            if (associatedContratistas.length > 0) {
                const primaryContratista = associatedContratistas[0];
                const cleanName = sanitizeString(item.nombre) || cleanEmail.split('@')[0] || 'Administrador Contratista';
                const [user, created] = await User.findOrCreate({
                    where: { email: cleanEmail },
                    defaults: {
                        name: cleanName,
                        password: defaultPasswordHash,
                        role: 'contratista_admin',
                        contratista_id: primaryContratista.id,
                        usu_id: item.usu_id || null,
                        activo: 1
                    },
                    transaction
                });

                if (!created) {
                    const updateFields = {};
                    if (user.role !== 'contratista_admin' && user.role !== 'admin' && user.role !== 'administrador_contrato') {
                        updateFields.role = 'contratista_admin';
                    }
                    if (user.contratista_id !== primaryContratista.id) updateFields.contratista_id = primaryContratista.id;
                    if (user.activo !== 1) updateFields.activo = 1;
                    if (cleanName && user.name !== cleanName) updateFields.name = cleanName;
                    if (item.usu_id && !user.usu_id) updateFields.usu_id = item.usu_id;

                    if (Object.keys(updateFields).length > 0) {
                        await user.update(updateFields, { transaction });
                    }
                }

                const associatedIds = associatedContratistas.map(c => c.id);
                for (const cId of associatedIds) {
                    await ContratistaUsuario.findOrCreate({
                        where: { user_id: user.id, contratista_id: cId },
                        transaction
                    });
                }

                await ContratistaUsuario.destroy({
                    where: {
                        user_id: user.id,
                        contratista_id: { [sequelize.Sequelize.Op.notIn]: associatedIds }
                    },
                    transaction
                });
                return user;
            } else {
                throw new Error(`No se pudo asociar a ninguna empresa contratista para ${cleanEmail}`);
            }
        };

        const syncSingleVinculacion = async (item, transaction) => {
            const gName = sanitizeString(item.gerencia) || 'GERENCIA GENERAL';
            const sgName = sanitizeString(item.subgerencia) || 'SUBGERENCIA GENERAL';
            const sName = sanitizeString(item.servicio) || 'SERVICIOS GENERALES';
            const dName = sanitizeString(item.dependencia) || 'OFICINA CENTRAL';
            const cRut = sanitizeString(item.rut_contratista) || '99999999-9';

            const resolved = resolveContractor(cRut, item.contratista);

            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sgName, gerencia_id: gerencia.id }, transaction });
            const [servicio] = await TipoContratista.findOrCreate({
                where: { nombre: sName, subgerencia_id: subgerencia.id },
                defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                transaction
            });
            const [dependencia] = await Dependencia.findOrCreate({ where: { nombre: dName }, defaults: { activo: 1 }, transaction });

            const cleanResolvedRut = cleanRutString(resolved.rut);
            const allLocal = await Contratista.findAll({ transaction });
            let contratista = allLocal.find(c => cleanRutString(c.rut) === cleanResolvedRut);

            if (!contratista) {
                contratista = await Contratista.create({
                    rut: resolved.rut,
                    nombre: sanitizeString(resolved.nombre) || resolved.rut,
                    activo: 1
                }, { transaction });
            }

            const fallbackContrato = sanitizeString(item.numero_contrato) || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}-${dependencia.id}-${Math.floor(1000 + Math.random() * 9000)}`;

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
                const itemContrato = sanitizeString(item.numero_contrato);
                if (itemContrato && normalize(vinculacion.numero_contrato) !== normalize(itemContrato)) {
                    const existsOther = await Vinculacion.findOne({
                        where: {
                            numero_contrato: itemContrato,
                            id: { [sequelize.Sequelize.Op.ne]: vinculacion.id }
                        },
                        transaction
                    });
                    if (!existsOther) {
                        updateData.numero_contrato = itemContrato;
                    }
                }
                if (item.fecha_inicio_contrato && vinculacion.fecha_inicio_contrato !== item.fecha_inicio_contrato) updateData.fecha_inicio_contrato = item.fecha_inicio_contrato;
                if (item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== item.fecha_termino_contrato) updateData.fecha_termino_contrato = item.fecha_termino_contrato;
                else if (!item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== null) updateData.fecha_termino_contrato = null;

                if (Object.keys(updateData).length > 0) {
                    await vinculacion.update(updateData, { transaction });
                }
            }
            return vinculacion;
        };

        const syncSingleAdministradorContrato = async (item, transaction) => {
            const cleanEmail = sanitizeEmail(item.email);
            if (!cleanEmail) throw new Error('Email de administrador de contrato es requerido.');

            const cleanName = sanitizeString(item.nombre) || cleanEmail.split('@')[0] || 'Administrador de Contrato';
            const [user, created] = await User.findOrCreate({
                where: { email: cleanEmail },
                defaults: {
                    name: cleanName,
                    password: defaultPasswordHash,
                    role: 'administrador_contrato',
                    usu_id: item.usu_id || null,
                    activo: 1
                },
                transaction
            });

            if (!created && user.role !== 'administrador_contrato' && user.role !== 'admin') {
                await user.update({ role: 'administrador_contrato' }, { transaction });
            }
            if (!created && item.usu_id && !user.usu_id) {
                await user.update({ usu_id: item.usu_id }, { transaction });
            }

            const syncedVinculacionIds = [];

            if (item.asignaciones && Array.isArray(item.asignaciones)) {
                for (const asig of item.asignaciones) {
                    const gName = sanitizeString(asig.resolvedGerencia || asig.gerencia) || 'GERENCIA GENERAL';
                    const sgName = sanitizeString(asig.resolvedSubgerencia || asig.subgerencia) || 'SUBGERENCIA GENERAL';
                    const sName = sanitizeString(asig.resolvedServicio || asig.servicio) || 'SERVICIOS GENERALES';
                    const dName = sanitizeString(asig.resolvedDependencia || asig.dependencia) || 'OFICINA CENTRAL';
                    const cRut = sanitizeString(asig.resolvedRutContratista || asig.rut_contratista) || '99999999-9';

                    const resolved = resolveContractor(cRut, asig.contratista);

                    const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
                    const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sgName, gerencia_id: gerencia.id }, transaction });
                    const [servicio] = await TipoContratista.findOrCreate({ where: { nombre: sName, subgerencia_id: subgerencia.id }, defaults: { descripcion: 'Sincronizado desde API', activo: 1 }, transaction });
                    const [dependencia] = await Dependencia.findOrCreate({ where: { nombre: dName }, defaults: { activo: 1 }, transaction });

                    const cleanResolvedRut = cleanRutString(resolved.rut);
                    const allLocal = await Contratista.findAll({ transaction });
                    let contratista = allLocal.find(c => cleanRutString(c.rut) === cleanResolvedRut);

                    if (!contratista) {
                        contratista = await Contratista.create({
                            rut: resolved.rut,
                            nombre: sanitizeString(resolved.nombre) || resolved.rut,
                            activo: 1
                        }, { transaction });
                    }

                    const fallbackContrato = sanitizeString(asig.contrato) || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}-${dependencia.id}-${Math.floor(1000 + Math.random() * 9000)}`;

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
                        const asigContrato = sanitizeString(asig.contrato);
                        if (asigContrato && normalize(vinculacion.numero_contrato) !== normalize(asigContrato)) {
                            const existsOther = await Vinculacion.findOne({
                                where: {
                                    numero_contrato: asigContrato,
                                    id: { [sequelize.Sequelize.Op.ne]: vinculacion.id }
                                },
                                transaction
                            });
                            if (!existsOther) {
                                updateData.numero_contrato = asigContrato;
                            }
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

            if (syncedVinculacionIds.length > 0) {
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
            return user;
        };

        // Dispatch per entity type
        if (type === 'gerencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleGerencia);
            }
        } else if (type === 'subgerencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleSubgerencia);
            }
        } else if (type === 'servicios') {
            for (const item of items) {
                await processGranularItem(item, syncSingleServicio);
            }
        } else if (type === 'dependencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleDependencia);
            }
        } else if (type === 'contratistas') {
            // First sync the contractor master entity
            for (const item of items) {
                await processGranularItem(item, async (contractorItem, transaction) => {
                    const contractor = await syncSingleContratista(contractorItem, transaction);

                    // Extract and sync nested or associated items (vinculaciones, admins)
                    const targetRutClean = cleanRutString(contractorItem.rut || contractor.rut);

                    // 1. Process nested asignaciones directly from payload if present
                    if (contractorItem.asignaciones && Array.isArray(contractorItem.asignaciones)) {
                        for (const asig of contractorItem.asignaciones) {
                            if (!asig) continue;
                            const vincItem = {
                                rut_contratista: contractor.rut,
                                contratista: contractor.nombre,
                                servicio: asig.servicio,
                                dependencia: asig.dependencia,
                                subgerencia: asig.subgerencia,
                                gerencia: asig.gerencia,
                                numero_contrato: asig.contrato || asig.numero_contrato || null
                            };
                            try {
                                await syncSingleVinculacion(vincItem, transaction);
                            } catch (vErr) {
                                console.warn(`⚠️ Granular warning on nested vinculación for ${contractor.rut}:`, vErr.message);
                            }

                            if (asig.administrador_contrato && Array.isArray(asig.administrador_contrato)) {
                                for (const admin of asig.administrador_contrato) {
                                    const adminEmail = sanitizeEmail(admin.email || (typeof admin === 'string' && admin.includes('@') ? admin : null));
                                    if (adminEmail) {
                                        const adminItem = {
                                            nombre: admin.nombre || adminEmail.split('@')[0],
                                            email: adminEmail,
                                            asignaciones: [{
                                                rut_contratista: contractor.rut,
                                                servicio: asig.servicio,
                                                dependencia: asig.dependencia,
                                                subgerencia: asig.subgerencia,
                                                gerencia: asig.gerencia,
                                                contrato: asig.contrato || null,
                                                contratista: contractor.nombre
                                            }]
                                        };
                                        try {
                                            await syncSingleAdministradorContrato(adminItem, transaction);
                                        } catch (aErr) {
                                            console.warn(`⚠️ Granular warning on nested admin contrato for ${adminEmail}:`, aErr.message);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 2. Process nested contratista_admin directly from payload if present
                    if (contractorItem.contratista_admin && Array.isArray(contractorItem.contratista_admin)) {
                        for (const cAdmin of contractorItem.contratista_admin) {
                            const cleanEmail = sanitizeEmail(cAdmin.email);
                            if (cleanEmail) {
                                const cAdminItem = {
                                    nombre: cAdmin.nombre,
                                    email: cleanEmail,
                                    rut_contratista: contractor.rut,
                                    rut_contratistas: [contractor.rut]
                                };
                                try {
                                    await syncSingleContratistaAdmin(cAdminItem, transaction);
                                } catch (caErr) {
                                    console.warn(`⚠️ Granular warning on nested contratista admin for ${cleanEmail}:`, caErr.message);
                                }
                            }
                        }
                    }

                    return contractor;
                });
            }
        } else if (type === 'contratista_admin') {
            for (const item of items) {
                await processGranularItem(item, (it, tx) => syncSingleContratistaAdmin(it, tx));
            }
        } else if (type === 'vinculaciones') {
            for (const item of items) {
                await processGranularItem(item, syncSingleVinculacion);
            }
        } else if (type === 'administrador_contrato') {
            for (const item of items) {
                await processGranularItem(item, syncSingleAdministradorContrato);
            }
        }

        res.json({
            success: true,
            message: `Sincronización granular finalizada. Procesados: ${syncedItems.length}, Con error: ${failedItems.length}`,
            syncedCount: syncedItems.length,
            failedCount: failedItems.length,
            failedItems: failedItems
        });
    } catch (error) {
        console.error('❌ Error no controlado en syncData:', error);
        res.status(500).json({ message: `Error general en sincronización: ${error.message}`, error: error.message });
    }
};


module.exports = { compareData, syncData };
