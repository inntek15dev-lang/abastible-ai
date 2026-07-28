const axios = require('axios');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion, User, Administracion, Gerencia, Subgerencia, ContratistaUsuario } = require('../database/models');
const { adoptOvalUsuId, nextLocalUsuId } = require('../utils/usuIdHomologation');

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

const extractContractorInfo = (item, fallbackName = '') => {
    if (!item) return { rut: '99999999-9', nombre: fallbackName || 'Empresa Sincronizada' };
    if (typeof item === 'string') return { rut: item, nombre: fallbackName || item };

    let rawRut = item.rut;
    if (!rawRut && item.cot_rut) {
        rawRut = item.cot_dv !== undefined && item.cot_dv !== null && item.cot_dv !== ''
            ? `${item.cot_rut}-${item.cot_dv}`
            : item.cot_rut.toString();
    }
    const rut = sanitizeString(rawRut) || '99999999-9';
    const nombre = sanitizeString(item.nombre || item.cot_razon_social) || fallbackName || rut;

    return { rut, nombre };
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

        const extGerencias = new Map();
        const extSubgerencias = new Map();
        const extServicios = new Map();
        const extDependencias = new Map();
        const extContratistas = new Map();
        const extContratistaAdmins = new Map();
        const extVinculaciones = [];
        const extAdministradorContratos = new Map();

        const subgerenciaToGerenciaMap = new Map();
        // Pre-populate map from local database
        const localSubgerenciasForMap = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
        localSubgerenciasForMap.forEach(s => {
            if (s.nombre && s.gerencia && s.gerencia.nombre) {
                subgerenciaToGerenciaMap.set(normalize(s.nombre), s.gerencia.nombre);
            }
        });

        // 1. Process Top-Level Arrays if explicitly returned
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

        // 2. Process Native Payload (contratistas array as formatted in oiem.json)
        externalContratistas.forEach(c => {
            if (!c) return;
            const contractorInfo = extractContractorInfo(c);
            const rawRut = contractorInfo.rut;
            const cNombre = contractorInfo.nombre;

            if (!rawRut) return;

            extContratistas.set(normalize(rawRut), {
                ...c,
                rut: rawRut,
                nombre: cNombre,
                cot_id: c.cot_id,
                cot_rut: c.cot_rut,
                cot_dv: c.cot_dv,
                cot_razon_social: c.cot_razon_social
            });

            // Parse contratista_admin array natively
            const admins = c.contratista_admin || (c.data && c.data.contratista_admin);
            if (admins && Array.isArray(admins)) {
                admins.forEach(admin => {
                    if (admin && admin.email) {
                        const emailNorm = normalize(admin.email);
                        if (extContratistaAdmins.has(emailNorm)) {
                            const existing = extContratistaAdmins.get(emailNorm);
                            if (!existing.rut_contratistas.includes(rawRut)) {
                                existing.rut_contratistas.push(rawRut);
                            }
                            // Mismo email con más de una cuenta Oval: gana el primer usu_id,
                            // los demás quedan registrados para gestión con OvalControl.
                            if (admin.usu_id != null) {
                                if (existing.usu_id == null) {
                                    existing.usu_id = admin.usu_id;
                                } else if (Number(existing.usu_id) !== Number(admin.usu_id)) {
                                    existing.usu_ids_duplicados = existing.usu_ids_duplicados || [];
                                    if (!existing.usu_ids_duplicados.includes(admin.usu_id)) {
                                        existing.usu_ids_duplicados.push(admin.usu_id);
                                    }
                                }
                            }
                        } else {
                            extContratistaAdmins.set(emailNorm, {
                                usu_id: admin.usu_id != null ? admin.usu_id : null,
                                nombre: admin.nombre,
                                email: admin.email,
                                rut_contratista: rawRut,
                                contratista: cNombre,
                                cot_rut: c.cot_rut,
                                cot_dv: c.cot_dv,
                                cot_razon_social: c.cot_razon_social,
                                rut_contratistas: [rawRut]
                            });
                        }
                    }
                });
            }

            // Parse asignaciones array natively
            const asigs = c.asignaciones || (c.data && c.data.asignaciones);
            if (asigs && Array.isArray(asigs)) {
                asigs.forEach(a => {
                    if (!a) return;
                    const gName = sanitizeString(a.gerencia) || 'GERENCIA GENERAL';
                    const sgName = sanitizeString(a.subgerencia) || 'SUBGERENCIA GENERAL';
                    const sName = sanitizeString(a.servicio) || 'SERVICIOS GENERALES';
                    const dName = sanitizeString(a.dependencia) || 'OFICINA CENTRAL';

                    extGerencias.set(normalize(gName), gName);
                    extSubgerencias.set(normalize(gName + '|' + sgName), { nombre: sgName, gerencia: gName });
                    extServicios.set(normalize(sgName + '|' + sName), { nombre: sName, subgerencia: sgName, gerencia: gName });
                    extDependencias.set(normalize(dName), dName);

                    const vincItem = {
                        rut_contratista: rawRut,
                        contratista: cNombre,
                        cot_id: c.cot_id,
                        cot_rut: c.cot_rut,
                        cot_dv: c.cot_dv,
                        cot_razon_social: c.cot_razon_social,
                        servicio: sName,
                        dependencia: dName,
                        subgerencia: sgName,
                        gerencia: gName,
                        contrato: a.contrato || null,
                        numero_contrato: a.contrato || null,
                        fecha_inicio_contrato: a.fecha_inicio || null,
                        fecha_termino_contrato: a.fecha_termino || null
                    };
                    extVinculaciones.push(vincItem);

                    // Parse administrador_contrato inside asignaciones natively
                    const adminList = a.administrador_contrato || a.administradores_contrato;
                    if (adminList && Array.isArray(adminList)) {
                        adminList.forEach(admin => {
                            if (!admin) return;
                            const email = admin.email || (typeof admin === 'string' && admin.includes('@') ? admin : null);
                            const nombre = admin.nombre || (typeof admin === 'string' ? admin : null);
                            
                            if (email) {
                                let key = normalize(email);
                                let adminObj = extAdministradorContratos.get(key);
                                if (!adminObj) {
                                    adminObj = { usu_id: admin.usu_id != null ? admin.usu_id : null, nombre: nombre || email.split('@')[0], email: email, asignaciones: [] };
                                    extAdministradorContratos.set(key, adminObj);
                                } else if (admin.usu_id != null) {
                                    if (adminObj.usu_id == null) {
                                        adminObj.usu_id = admin.usu_id;
                                    } else if (Number(adminObj.usu_id) !== Number(admin.usu_id)) {
                                        adminObj.usu_ids_duplicados = adminObj.usu_ids_duplicados || [];
                                        if (!adminObj.usu_ids_duplicados.includes(admin.usu_id)) {
                                            adminObj.usu_ids_duplicados.push(admin.usu_id);
                                        }
                                    }
                                }
                                
                                const newAsig = {
                                    rut_contratista: rawRut,
                                    contratista: cNombre,
                                    cot_rut: c.cot_rut,
                                    cot_dv: c.cot_dv,
                                    cot_razon_social: c.cot_razon_social,
                                    servicio: sName,
                                    dependencia: dName,
                                    subgerencia: sgName,
                                    gerencia: gName,
                                    contrato: a.contrato || null,
                                    numero_contrato: a.contrato || null
                                };

                                const alreadyExists = adminObj.asignaciones.some(oldAsig =>
                                    normalize(oldAsig.servicio) === normalize(newAsig.servicio) &&
                                    normalize(oldAsig.dependencia) === normalize(newAsig.dependencia) &&
                                    normalize(oldAsig.subgerencia) === normalize(newAsig.subgerencia) &&
                                    normalize(oldAsig.gerencia) === normalize(newAsig.gerencia) &&
                                    cleanRutString(oldAsig.rut_contratista) === cleanRutString(newAsig.rut_contratista)
                                );

                                if (!alreadyExists) {
                                    adminObj.asignaciones.push(newAsig);
                                }
                            }
                        });
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
        const localContratistaUsuarios = await ContratistaUsuario.findAll();
        const localAdministraciones = await Administracion.findAll({ where: { activo: 1 } });

        // Maps for fast lookup
        const locGerenciasMap = new Set(localGerencias.map(g => normalize(g.nombre)));
        const locSubgerenciasMap = new Set(localSubgerencias.map(s => normalize((s.gerencia ? s.gerencia.nombre : '') + '|' + s.nombre)));
        const locServiciosMap = new Set(localServicios.map(s => normalize((s.subgerencia ? s.subgerencia.nombre : '') + '|' + s.nombre)));
        const locDependenciasMap = new Set(localDependencias.map(d => normalize(d.nombre)));
        const locContratistasByRut = new Map(localContratistas.map(c => [cleanRutString(c.rut), c]));
        const locUsersByEmail = new Map(localUsers.map(u => [normalize(u.email), u]));
        const locUsersByUsuId = new Map(localUsers.filter(u => u.usu_id != null).map(u => [Number(u.usu_id), u]));

        // Índices locales para detectar drift contra OVAL (asociaciones/administraciones
        // que el sistema tiene pero OVAL ya no): la homologación debe podarlas.
        const contratistaRutById = new Map(localContratistas.map(c => [Number(c.id), cleanRutString(c.rut)]));
        const assocRutsByUser = new Map();
        localContratistaUsuarios.forEach(cu => {
            const uId = Number(cu.user_id);
            if (!assocRutsByUser.has(uId)) assocRutsByUser.set(uId, new Set());
            const rut = contratistaRutById.get(Number(cu.contratista_id));
            if (rut) assocRutsByUser.get(uId).add(rut);
        });

        const vincKeyById = new Map();
        const locActiveVincKeysByRut = new Map();
        localVinculaciones.forEach(v => {
            if (v.contratista && v.servicio && v.dependencia && v.subgerencia && v.gerencia) {
                const cleanRut = cleanRutString(v.contratista.rut);
                const subKey = `${normalize(v.servicio.nombre)}|${normalize(v.dependencia.nombre)}|${normalize(v.subgerencia.nombre)}|${normalize(v.gerencia.nombre)}`;
                vincKeyById.set(Number(v.id), `${cleanRut}|${subKey}`);
                if (v.activo === 1) {
                    if (!locActiveVincKeysByRut.has(cleanRut)) locActiveVincKeysByRut.set(cleanRut, new Set());
                    locActiveVincKeysByRut.get(cleanRut).add(subKey);
                }
            }
        });

        const adminVincKeysByUser = new Map();
        localAdministraciones.forEach(a => {
            const uId = Number(a.administrador_contrato_id);
            if (!adminVincKeysByUser.has(uId)) adminVincKeysByUser.set(uId, new Set());
            const vk = vincKeyById.get(Number(a.vinculacion_id));
            if (vk) adminVincKeysByUser.get(uId).add(vk);
        });

        // Estado de un usuario según homologación: 'exists' solo si email y usu_id coinciden
        // con Oval; si existe pero su usu_id local difiere (o el ID lo posee otro usuario),
        // queda 'updated' para que la sincronización lo re-homologue.
        const computeUserEstado = (item) => {
            const localByEmail = locUsersByEmail.get(normalize(item.email));
            const localByUsuId = item.usu_id != null ? locUsersByUsuId.get(Number(item.usu_id)) : null;
            if (!localByEmail && !localByUsuId) return 'new';
            if (item.usu_id == null) return 'exists';
            if (localByEmail && Number(localByEmail.usu_id) === Number(item.usu_id)) return 'exists';
            return 'updated';
        };

        const locVinculacionesMap = new Map();
        localVinculaciones.forEach(v => {
            if (v.contratista && v.servicio && v.dependencia && v.subgerencia && v.gerencia) {
                const cleanRut = cleanRutString(v.contratista.rut);
                const key = `${cleanRut}|${normalize(v.servicio.nombre)}|${normalize(v.dependencia.nombre)}|${normalize(v.subgerencia.nombre)}|${normalize(v.gerencia.nombre)}`;
                locVinculacionesMap.set(key, { numero: v.numero_contrato, activo: v.activo });
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

        // Claves de vinculación esperadas por empresa según OVAL (para detectar locales obsoletas)
        const extVincKeysByRut = new Map();
        extVinculaciones.forEach(v => {
            const cleanRut = cleanRutString(v.rut_contratista);
            if (!extVincKeysByRut.has(cleanRut)) extVincKeysByRut.set(cleanRut, new Set());
            extVincKeysByRut.get(cleanRut).add(`${normalize(v.servicio)}|${normalize(v.dependencia)}|${normalize(v.subgerencia)}|${normalize(v.gerencia)}`);
        });

        const diffContratistas = [];
        extContratistas.forEach((data, rutNorm) => {
            const info = extractContractorInfo(data);
            const cleanRut = cleanRutString(info.rut);
            const localC = locContratistasByRut.get(cleanRut);
            let estado = 'new';
            if (localC) {
                estado = 'exists';
                const nombreDrift = info.nombre && localC.nombre !== info.nombre && info.nombre !== localC.rut;
                const inactivo = localC.activo !== 1;
                // Vinculaciones activas locales que OVAL ya no tiene => la empresa requiere re-homologación
                const expectedKeys = extVincKeysByRut.get(cleanRut) || new Set();
                const currentKeys = locActiveVincKeysByRut.get(cleanRut) || new Set();
                const staleVinc = [...currentKeys].some(k => !expectedKeys.has(k));
                if (nombreDrift || inactivo || staleVinc) estado = 'updated';
            }
            diffContratistas.push({ ...data, rut: info.rut, nombre: info.nombre, estado });
        });

        const diffContratistaAdmin = [];
        extContratistaAdmins.forEach((data, normEmail) => {
            let estado = computeUserEstado(data);
            if (estado === 'exists') {
                // Drift de datos: nombre, estado activo, rol o set de empresas asociadas distinto a OVAL
                const localU = locUsersByEmail.get(normEmail);
                const cleanName = sanitizeString(data.nombre);
                const nameDrift = cleanName && localU.name !== cleanName;
                const inactivo = localU.activo !== 1;
                const roleDrift = localU.role !== 'contratista_admin' && localU.role !== 'admin';
                const expected = new Set((data.rut_contratistas || []).map(cleanRutString));
                const current = assocRutsByUser.get(Number(localU.usu_id)) || new Set();
                const assocDrift = expected.size !== current.size || [...expected].some(r => !current.has(r));
                if (nameDrift || inactivo || roleDrift || assocDrift) estado = 'updated';
            }
            diffContratistaAdmin.push({
                ...data,
                estado
            });
        });

        const diffVinculaciones = [];
        extVinculaciones.forEach(v => {
            const info = extractContractorInfo({ rut: v.rut_contratista, nombre: v.contratista, cot_rut: v.cot_rut, cot_dv: v.cot_dv, cot_razon_social: v.cot_razon_social });
            const cleanRut = cleanRutString(info.rut);
            const key = `${cleanRut}|${normalize(v.servicio)}|${normalize(v.dependencia)}|${normalize(v.subgerencia)}|${normalize(v.gerencia)}`;
            const effectiveStartDate = v.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const effectiveEndDate = v.fecha_termino_contrato || null;

            if (!locVinculacionesMap.has(key)) {
                diffVinculaciones.push({ ...v, rut_contratista: info.rut, contratista: info.nombre, fecha_inicio_contrato: effectiveStartDate, fecha_termino_contrato: effectiveEndDate, estado: 'new' });
            } else {
                const local = locVinculacionesMap.get(key);
                const needsUpdate = normalize(v.numero_contrato || v.contrato) !== normalize(local.numero) || local.activo !== 1;
                diffVinculaciones.push({ ...v, rut_contratista: info.rut, contratista: info.nombre, fecha_inicio_contrato: effectiveStartDate, fecha_termino_contrato: effectiveEndDate, local_numero_contrato: local.numero, estado: needsUpdate ? 'updated' : 'exists' });
            }
        });

        const diffAdministradorContrato = [];
        extAdministradorContratos.forEach((data, normEmail) => {
            let estado = computeUserEstado(data);
            if (estado === 'exists') {
                // Drift de datos: nombre, activo, rol o portafolio de administraciones distinto a OVAL
                const localU = locUsersByEmail.get(normEmail);
                const cleanName = sanitizeString(data.nombre);
                const nameDrift = cleanName && localU.name !== cleanName;
                const inactivo = localU.activo !== 1;
                const roleDrift = localU.role !== 'administrador_contrato' && localU.role !== 'admin';
                const expected = new Set((data.asignaciones || []).map(a =>
                    `${cleanRutString(a.rut_contratista)}|${normalize(a.servicio)}|${normalize(a.dependencia)}|${normalize(a.subgerencia)}|${normalize(a.gerencia)}`
                ));
                const current = adminVincKeysByUser.get(Number(localU.usu_id)) || new Set();
                const asigDrift = expected.size !== current.size || [...expected].some(k => !current.has(k));
                if (nameDrift || inactivo || roleDrift || asigDrift) estado = 'updated';
            }
            diffAdministradorContrato.push({
                ...data,
                estado
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
        const { type, items, force } = req.body;
        console.log(`📥 Syncing ${items ? items.length : 0} items of type ${type}...`);

        if (!Array.isArray(items)) throw new Error('Invalid items format');

        // Modo espejo: SOLO cuando `force === true` el llamador garantiza que `items` es
        // el set COMPLETO y autoritativo de OVAL para este tipo (así lo envía el botón
        // "RE-SINCRONIZACIÓN FULL"). Únicamente entonces se podan los residuales locales
        // que ya no están en OVAL. Las llamadas parciales (un solo ítem, o solo pendientes)
        // nunca podan: no tienen visión completa para decidir qué sobra.
        const mirror = force === true;
        const prunedItems = [];

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

        const syncedItems = [];
        const failedItems = [];
        const warnings = [];

        // Resuelve (o crea) el usuario local homologado. El usu_id de Oval es autoritativo:
        // si el usuario existe con otro usu_id se re-homologa con cascada de referencias;
        // si Oval no envía usu_id se usa el usuario por email o se crea uno del rango local.
        const resolveHomologatedUser = async ({ cleanEmail, cleanName, role, extraDefaults = {}, ovalUsuId, transaction }) => {
            let user = null;
            let created = false;
            if (ovalUsuId != null && ovalUsuId !== '') {
                user = await adoptOvalUsuId({ sequelize, User, email: cleanEmail, targetUsuId: ovalUsuId, transaction });
            } else {
                user = await User.findOne({ where: { email: cleanEmail }, transaction });
            }

            if (!user) {
                // usu_id explícito siempre: el de Oval, o uno del rango local reservado
                // (también funciona antes de aplicar la migración de AUTO_INCREMENT).
                const explicitUsuId = ovalUsuId != null && ovalUsuId !== ''
                    ? Number(ovalUsuId)
                    : await nextLocalUsuId(User, transaction);
                await User.create({
                    name: cleanName,
                    email: cleanEmail,
                    password: defaultPasswordHash,
                    role,
                    usu_id: explicitUsuId,
                    activo: 1,
                    ...extraDefaults
                }, { transaction });
                // Re-fetch obligatorio: al insertar usu_id explícito, Sequelize pisa el
                // usu_id de la instancia con el insertId de MySQL (columna AUTO_INCREMENT
                // física), dejando la instancia en memoria con un valor incorrecto.
                user = await User.findOne({ where: { email: cleanEmail }, transaction });
                if (!user || user.usu_id == null) {
                    throw new Error(`No se pudo crear el usuario homologado ${cleanEmail} (usu_id ${explicitUsuId}).`);
                }
                created = true;
            }
            return { user, created };
        };

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

        // Entidades taxonómicas (Gerencia/Subgerencia/Servicio/Dependencia): sin data
        // operativa colgando de su propio ID (las Vinculaciones que las referencian se
        // re-resuelven siempre por nombre en el mismo paso de sincronización), por lo
        // que "eliminar y crear" se implementa literal: DELETE + INSERT, sin diffing.
        const syncSingleGerencia = async (item, transaction) => {
            const gName = sanitizeString(item.nombre) || 'GERENCIA GENERAL';
            await Gerencia.destroy({ where: { nombre: gName }, transaction });
            return await Gerencia.create({ nombre: gName, activo: 1 }, { transaction });
        };

        const syncSingleSubgerencia = async (item, transaction) => {
            const sName = sanitizeString(item.nombre) || 'SUBGERENCIA GENERAL';
            const gName = sanitizeString(item.gerencia) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            await Subgerencia.destroy({ where: { nombre: sName, gerencia_id: gerencia.id }, transaction });
            return await Subgerencia.create({ nombre: sName, gerencia_id: gerencia.id, activo: 1 }, { transaction });
        };

        const syncSingleServicio = async (item, transaction) => {
            const servName = sanitizeString(item.nombre || item.servicio) || 'SERVICIOS GENERALES';
            const sName = sanitizeString(item.subgerencia) || 'SUBGERENCIA GENERAL';
            const gName = sanitizeString(item.gerencia) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sName, gerencia_id: gerencia.id }, transaction });
            const existing = await TipoContratista.findOne({ where: { nombre: servName, subgerencia_id: subgerencia.id }, transaction });
            // Preserva programa_id: es una asociación funcional local (qué programa de
            // cumplimiento aplica a este servicio) que OVAL no gestiona ni envía.
            const preservedProgramaId = existing ? existing.programa_id : null;
            if (existing) await existing.destroy({ transaction });
            return await TipoContratista.create({
                nombre: servName,
                subgerencia_id: subgerencia.id,
                programa_id: preservedProgramaId,
                descripcion: 'Sincronizado desde API',
                activo: 1
            }, { transaction });
        };

        const syncSingleDependencia = async (item, transaction) => {
            const dName = sanitizeString(item.nombre) || 'OFICINA CENTRAL';
            const existing = await Dependencia.findOne({ where: { nombre: dName }, transaction });
            // Preserva subgerencia_id: relación local que OVAL no envía en su payload plano.
            const preservedSubgerenciaId = existing ? existing.subgerencia_id : null;
            if (existing) await existing.destroy({ transaction });
            return await Dependencia.create({ nombre: dName, subgerencia_id: preservedSubgerenciaId, activo: 1 }, { transaction });
        };

        // Contratista tiene data operativa colgando de su ID (Vinculacion.contratista_id,
        // User.contratista_id, ContratistaUsuario.contratista_id) que se resuelve por RUT
        // en pasos posteriores del mismo full-sync, así que un DELETE+INSERT (nuevo ID)
        // los rompería o generaría duplicados. "Eliminar y crear" = sobrescritura total
        // incondicional de todos los campos que gestiona OVAL, preservando el ID/RUT.
        const syncSingleContratista = async (item, transaction) => {
            const info = extractContractorInfo(item);
            if (!info.rut) throw new Error('RUT de contratista no especificado.');

            const cleanFormattedRut = cleanRutString(info.rut);
            const allLocal = await Contratista.findAll({ transaction });

            let contractor = allLocal.find(c => {
                const localClean = cleanRutString(c.rut);
                return localClean === cleanFormattedRut || (localClean.length >= 8 && localClean.slice(0, -1) === cleanFormattedRut.slice(0, -1));
            });

            if (!contractor) {
                contractor = await Contratista.create({
                    rut: info.rut,
                    nombre: info.nombre,
                    activo: 1
                }, { transaction });
            } else {
                await contractor.update({ nombre: info.nombre || contractor.nombre, activo: 1 }, { transaction });
            }
            return contractor;
        };

        // opts.prune: solo cuando el ítem representa el estado COMPLETO del usuario en OVAL
        // (pasos contratista_admin / administrador_contrato, agregados por email). Las
        // llamadas anidadas desde el paso contratistas ven una sola empresa y no podan.
        const syncSingleContratistaAdmin = async (item, transaction, opts = {}) => {
            const cleanEmail = sanitizeEmail(item.email);
            if (!cleanEmail) throw new Error('Email de administrador contratista es requerido.');

            let ruts = item.rut_contratistas || [item.rut_contratista || (item.cot_rut ? `${item.cot_rut}-${item.cot_dv || ''}`.replace(/-$/, '') : '99999999-9')];
            if (!Array.isArray(ruts) || ruts.length === 0) {
                ruts = ['99999999-9'];
            }

            const allLocal = await Contratista.findAll({ transaction });
            const associatedContratistas = [];

            for (const rawCRut of ruts) {
                const info = extractContractorInfo({ rut: rawCRut, cot_rut: item.cot_rut, cot_dv: item.cot_dv, cot_razon_social: item.cot_razon_social || item.contratista });
                const cleanCRut = cleanRutString(info.rut);

                let contratista = allLocal.find(c => cleanRutString(c.rut) === cleanCRut);

                if (!contratista) {
                    contratista = await Contratista.create({
                        rut: info.rut,
                        nombre: info.nombre,
                        activo: 1
                    }, { transaction });
                    allLocal.push(contratista);
                }

                if (contratista && !associatedContratistas.some(c => c.id === contratista.id)) {
                    associatedContratistas.push(contratista);
                }
            }

            if (associatedContratistas.length > 0) {
                const primaryContratista = associatedContratistas[0];
                const cleanName = sanitizeString(item.nombre) || cleanEmail.split('@')[0] || 'Administrador Contratista';
                let { user, created } = await resolveHomologatedUser({
                    cleanEmail,
                    cleanName,
                    role: 'contratista_admin',
                    extraDefaults: { contratista_id: primaryContratista.id },
                    ovalUsuId: item.usu_id,
                    transaction
                });

                if (!created) {
                    // OVAL manda: sobrescritura total incondicional. usu_id es la identidad
                    // estable (ya homologada arriba); email/nombre/empresa se pisan siempre.
                    // Único resguardo: nunca degradar a un usuario core (rol admin).
                    await user.update({
                        role: user.role === 'admin' ? 'admin' : 'contratista_admin',
                        email: cleanEmail,
                        name: cleanName,
                        contratista_id: primaryContratista.id,
                        activo: 1
                    }, { transaction });
                }

                if (user.usu_id == null) {
                    throw new Error(`Usuario ${cleanEmail} sin usu_id homologado; no es posible asociarlo a empresas contratistas.`);
                }

                const associatedIds = associatedContratistas.map(c => c.id);
                for (const cId of associatedIds) {
                    await ContratistaUsuario.findOrCreate({
                        where: { user_id: user.usu_id, contratista_id: cId },
                        transaction
                    });
                }

                // Homologación total: eliminar asociaciones a empresas que OVAL ya no reporta
                if (opts.prune && associatedIds.length > 0) {
                    await ContratistaUsuario.destroy({
                        where: {
                            user_id: user.usu_id,
                            contratista_id: { [Op.notIn]: associatedIds }
                        },
                        transaction
                    });
                }

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

            const info = extractContractorInfo(item);

            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sgName, gerencia_id: gerencia.id }, transaction });
            const [servicio] = await TipoContratista.findOrCreate({
                where: { nombre: sName, subgerencia_id: subgerencia.id },
                defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                transaction
            });
            const [dependencia] = await Dependencia.findOrCreate({ where: { nombre: dName }, defaults: { activo: 1 }, transaction });

            const cleanCRut = cleanRutString(info.rut);
            const allLocal = await Contratista.findAll({ transaction });
            let contratista = allLocal.find(c => cleanRutString(c.rut) === cleanCRut);

            if (!contratista) {
                contratista = await Contratista.create({
                    rut: info.rut,
                    nombre: info.nombre,
                    activo: 1
                }, { transaction });
            }

            const itemContrato = sanitizeString(item.contrato || item.numero_contrato);
            const fallbackContrato = itemContrato || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}-${dependencia.id}`;

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
                    numero_contrato: fallbackContrato,
                    fecha_inicio_contrato: item.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    fecha_termino_contrato: item.fecha_termino_contrato || null
                },
                transaction
            });

            if (!created) {
                // OVAL manda: sobrescritura total incondicional (preserva el ID para no
                // romper el historial de Registros que apuntan a esta vinculación).
                await vinculacion.update({
                    numero_contrato: itemContrato || vinculacion.numero_contrato,
                    fecha_inicio_contrato: item.fecha_inicio_contrato || vinculacion.fecha_inicio_contrato,
                    fecha_termino_contrato: item.fecha_termino_contrato !== undefined ? item.fecha_termino_contrato : vinculacion.fecha_termino_contrato,
                    activo: 1
                }, { transaction });
            }
            return vinculacion;
        };

        const syncSingleAdministradorContrato = async (item, transaction, opts = {}) => {
            const cleanEmail = sanitizeEmail(item.email);
            if (!cleanEmail) throw new Error('Email de administrador de contrato es requerido.');

            const cleanName = sanitizeString(item.nombre) || cleanEmail.split('@')[0] || 'Administrador de Contrato';
            let { user, created } = await resolveHomologatedUser({
                cleanEmail,
                cleanName,
                role: 'administrador_contrato',
                ovalUsuId: item.usu_id,
                transaction
            });

            if (!created) {
                // OVAL manda: sobrescritura total incondicional. usu_id es la identidad
                // estable (ya homologada arriba); email/nombre se pisan siempre.
                // Único resguardo: nunca degradar a un usuario core (rol admin).
                await user.update({
                    role: user.role === 'admin' ? 'admin' : 'administrador_contrato',
                    email: cleanEmail,
                    name: cleanName,
                    activo: 1
                }, { transaction });
            }

            if (user.usu_id == null) {
                throw new Error(`Usuario ${cleanEmail} sin usu_id homologado; no es posible crear administraciones de contrato.`);
            }

            const syncedVinculacionIds = [];

            if (item.asignaciones && Array.isArray(item.asignaciones)) {
                for (const asig of item.asignaciones) {
                    if (!asig) continue;
                    const gName = sanitizeString(asig.gerencia) || 'GERENCIA GENERAL';
                    const sgName = sanitizeString(asig.subgerencia) || 'SUBGERENCIA GENERAL';
                    const sName = sanitizeString(asig.servicio) || 'SERVICIOS GENERALES';
                    const dName = sanitizeString(asig.dependencia) || 'OFICINA CENTRAL';

                    const info = extractContractorInfo(asig);

                    const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
                    const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sgName, gerencia_id: gerencia.id }, transaction });
                    const [servicio] = await TipoContratista.findOrCreate({ where: { nombre: sName, subgerencia_id: subgerencia.id }, defaults: { descripcion: 'Sincronizado desde API', activo: 1 }, transaction });
                    const [dependencia] = await Dependencia.findOrCreate({ where: { nombre: dName }, defaults: { activo: 1 }, transaction });

                    const cleanCRut = cleanRutString(info.rut);
                    const allLocal = await Contratista.findAll({ transaction });
                    let contratista = allLocal.find(c => cleanRutString(c.rut) === cleanCRut);

                    if (!contratista) {
                        contratista = await Contratista.create({
                            rut: info.rut,
                            nombre: info.nombre,
                            activo: 1
                        }, { transaction });
                    }

                    const asigContrato = sanitizeString(asig.contrato || asig.numero_contrato);
                    const fallbackContrato = asigContrato || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}-${dependencia.id}`;

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
                            numero_contrato: fallbackContrato
                        },
                        transaction
                    });

                    if (!vincCreated && asigContrato && normalize(vinculacion.numero_contrato) !== normalize(asigContrato)) {
                        await vinculacion.update({ numero_contrato: asigContrato }, { transaction });
                    }

                    syncedVinculacionIds.push(vinculacion.id);

                    const [adminAssoc, adminAssocCreated] = await Administracion.findOrCreate({
                        where: {
                            vinculacion_id: vinculacion.id,
                            administrador_contrato_id: user.usu_id
                        },
                        defaults: { activo: 1 },
                        transaction
                    });

                    if (!adminAssocCreated && adminAssoc.activo !== 1) {
                        await adminAssoc.update({ activo: 1 }, { transaction });
                    }
                }
            }

            // Homologación total: eliminar administraciones sobre vinculaciones que OVAL
            // ya no asigna a este administrador (el ítem trae su portafolio completo).
            if (opts.prune && Array.isArray(item.asignaciones)) {
                const pruneWhere = { administrador_contrato_id: user.usu_id };
                if (syncedVinculacionIds.length > 0) {
                    pruneWhere.vinculacion_id = { [Op.notIn]: syncedVinculacionIds };
                }
                await Administracion.destroy({ where: pruneWhere, transaction });
            }

            return user;
        };

        // Dispatch per entity type
        if (type === 'gerencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleGerencia);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(i.nombre)));
                const local = await Gerencia.findAll();
                const staleIds = local.filter(g => !target.has(normalize(g.nombre))).map(g => g.id);
                if (staleIds.length > 0) {
                    await Gerencia.destroy({ where: { id: { [Op.in]: staleIds } } });
                    prunedItems.push(...staleIds.map(id => ({ tipo: 'gerencias', id })));
                }
            }
        } else if (type === 'subgerencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleSubgerencia);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(`${i.gerencia}|${i.nombre}`)));
                const local = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
                const staleIds = local.filter(s => !target.has(normalize(`${s.gerencia ? s.gerencia.nombre : ''}|${s.nombre}`))).map(s => s.id);
                if (staleIds.length > 0) {
                    await Subgerencia.destroy({ where: { id: { [Op.in]: staleIds } } });
                    prunedItems.push(...staleIds.map(id => ({ tipo: 'subgerencias', id })));
                }
            }
        } else if (type === 'servicios') {
            for (const item of items) {
                await processGranularItem(item, syncSingleServicio);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(`${i.subgerencia}|${i.nombre}`)));
                const local = await TipoContratista.findAll({ include: [{ model: Subgerencia, as: 'subgerencia' }] });
                const staleIds = local.filter(s => !target.has(normalize(`${s.subgerencia ? s.subgerencia.nombre : ''}|${s.nombre}`))).map(s => s.id);
                if (staleIds.length > 0) {
                    await TipoContratista.destroy({ where: { id: { [Op.in]: staleIds } } });
                    prunedItems.push(...staleIds.map(id => ({ tipo: 'servicios', id })));
                }
            }
        } else if (type === 'dependencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleDependencia);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(i.nombre)));
                const local = await Dependencia.findAll();
                const staleIds = local.filter(d => !target.has(normalize(d.nombre))).map(d => d.id);
                if (staleIds.length > 0) {
                    await Dependencia.destroy({ where: { id: { [Op.in]: staleIds } } });
                    prunedItems.push(...staleIds.map(id => ({ tipo: 'dependencias', id })));
                }
            }
        } else if (type === 'contratistas') {
            // First sync the contractor master entity
            for (const item of items) {
                await processGranularItem(item, async (contractorItem, transaction) => {
                    const contractor = await syncSingleContratista(contractorItem, transaction);

                    // 1. Process nested asignaciones directly from payload if present
                    const processedVincIds = [];
                    let nestedVincFailed = false;
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
                                const vinc = await syncSingleVinculacion(vincItem, transaction);
                                processedVincIds.push(vinc.id);
                            } catch (vErr) {
                                nestedVincFailed = true;
                                console.warn(`⚠️ Granular warning on nested vinculación for ${contractor.rut}:`, vErr.message);
                                warnings.push({ tipo: 'vinculacion', contratista: contractor.rut, error: vErr.message });
                            }

                            if (asig.administrador_contrato && Array.isArray(asig.administrador_contrato)) {
                                for (const admin of asig.administrador_contrato) {
                                    const adminEmail = sanitizeEmail(admin.email || (typeof admin === 'string' && admin.includes('@') ? admin : null));
                                    if (adminEmail) {
                                        const adminItem = {
                                            nombre: admin.nombre || adminEmail.split('@')[0],
                                            email: adminEmail,
                                            usu_id: admin.usu_id || null,
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
                                            warnings.push({ tipo: 'administrador_contrato', contratista: contractor.rut, email: adminEmail, error: aErr.message });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Homologación total: eliminar vinculaciones locales de esta empresa que
                    // OVAL ya no envía (los Registro que las referencian quedan huérfanos,
                    // nunca se tocan). Solo si todas las asignaciones anidadas se procesaron
                    // sin error (evita borrar de más ante un fallo parcial).
                    if (Array.isArray(contractorItem.asignaciones) && !nestedVincFailed) {
                        const pruneWhere = { contratista_id: contractor.id };
                        if (processedVincIds.length > 0) {
                            pruneWhere.id = { [Op.notIn]: processedVincIds };
                        }
                        await Vinculacion.destroy({ where: pruneWhere, transaction });
                    }

                    // 2. Process nested contratista_admin directly from payload if present
                    if (contractorItem.contratista_admin && Array.isArray(contractorItem.contratista_admin)) {
                        for (const cAdmin of contractorItem.contratista_admin) {
                            const cleanEmail = sanitizeEmail(cAdmin.email);
                            if (cleanEmail) {
                                const cAdminItem = {
                                    nombre: cAdmin.nombre,
                                    email: cleanEmail,
                                    usu_id: cAdmin.usu_id || null,
                                    rut_contratista: contractor.rut,
                                    rut_contratistas: [contractor.rut]
                                };
                                try {
                                    await syncSingleContratistaAdmin(cAdminItem, transaction);
                                } catch (caErr) {
                                    console.warn(`⚠️ Granular warning on nested contratista admin for ${cleanEmail}:`, caErr.message);
                                    warnings.push({ tipo: 'contratista_admin', contratista: contractor.rut, email: cleanEmail, error: caErr.message });
                                }
                            }
                        }
                    }

                    return contractor;
                });
            }
            if (mirror) {
                const target = new Set(items.map(i => cleanRutString(extractContractorInfo(i).rut)));
                const local = await Contratista.findAll();
                const stale = local.filter(c => !target.has(cleanRutString(c.rut)));
                for (const c of stale) {
                    // ContratistaUsuario cae por FK CASCADE; limpiar referencias huérfanas
                    // de tablas migrables que no tienen esa cascada física.
                    await Vinculacion.destroy({ where: { contratista_id: c.id } });
                    await c.destroy();
                    prunedItems.push({ tipo: 'contratistas', rut: c.rut });
                }
            }
        } else if (type === 'contratista_admin') {
            // Ítems agregados por email = estado completo del usuario en OVAL => se poda
            for (const item of items) {
                await processGranularItem(item, (it, tx) => syncSingleContratistaAdmin(it, tx, { prune: true }));
            }
            if (mirror) {
                const target = new Set(items.filter(i => i.usu_id != null).map(i => Number(i.usu_id)));
                const local = await User.findAll({ where: { role: 'contratista_admin' } });
                const stale = local.filter(u => u.usu_id != null && !target.has(Number(u.usu_id)));
                for (const u of stale) {
                    await ContratistaUsuario.destroy({ where: { user_id: u.usu_id } });
                    await u.destroy();
                    prunedItems.push({ tipo: 'contratista_admin', email: u.email });
                }
            }
        } else if (type === 'vinculaciones') {
            for (const item of items) {
                await processGranularItem(item, syncSingleVinculacion);
            }
            if (mirror) {
                const target = new Set(items.map(i => {
                    const info = extractContractorInfo({ rut: i.rut_contratista, nombre: i.contratista, cot_rut: i.cot_rut, cot_dv: i.cot_dv, cot_razon_social: i.cot_razon_social });
                    return `${cleanRutString(info.rut)}|${normalize(i.servicio)}|${normalize(i.dependencia)}|${normalize(i.subgerencia)}|${normalize(i.gerencia)}`;
                }));
                const local = await Vinculacion.findAll({
                    include: [
                        { model: Contratista, as: 'contratista' },
                        { model: TipoContratista, as: 'servicio' },
                        { model: Dependencia, as: 'dependencia' },
                        { model: Subgerencia, as: 'subgerencia' },
                        { model: Gerencia, as: 'gerencia' }
                    ]
                });
                const stale = local.filter(v => {
                    if (!v.contratista || !v.servicio || !v.dependencia || !v.subgerencia || !v.gerencia) return false;
                    const key = `${cleanRutString(v.contratista.rut)}|${normalize(v.servicio.nombre)}|${normalize(v.dependencia.nombre)}|${normalize(v.subgerencia.nombre)}|${normalize(v.gerencia.nombre)}`;
                    return !target.has(key);
                });
                if (stale.length > 0) {
                    await Vinculacion.destroy({ where: { id: { [Op.in]: stale.map(v => v.id) } } });
                    prunedItems.push(...stale.map(v => ({ tipo: 'vinculaciones', id: v.id })));
                }
            }
        } else if (type === 'administrador_contrato') {
            // Ítems agregados por email = portafolio completo del ADC en OVAL => se poda
            for (const item of items) {
                await processGranularItem(item, (it, tx) => syncSingleAdministradorContrato(it, tx, { prune: true }));
            }
            if (mirror) {
                const target = new Set(items.filter(i => i.usu_id != null).map(i => Number(i.usu_id)));
                const local = await User.findAll({ where: { role: 'administrador_contrato' } });
                const stale = local.filter(u => u.usu_id != null && !target.has(Number(u.usu_id)));
                for (const u of stale) {
                    await Administracion.destroy({ where: { administrador_contrato_id: u.usu_id } });
                    await u.destroy();
                    prunedItems.push({ tipo: 'administrador_contrato', email: u.email });
                }
            }
        }

        res.json({
            success: true,
            message: `Sincronización granular finalizada. Procesados: ${syncedItems.length}, Con error: ${failedItems.length}${warnings.length > 0 ? `, Advertencias: ${warnings.length}` : ''}${prunedItems.length > 0 ? `, Eliminados (residuales): ${prunedItems.length}` : ''}`,
            syncedCount: syncedItems.length,
            failedCount: failedItems.length,
            failedItems: failedItems,
            warnings: warnings,
            prunedCount: prunedItems.length,
            prunedItems: prunedItems
        });
    } catch (error) {
        console.error('❌ Error no controlado en syncData:', error);
        res.status(500).json({ message: `Error general en sincronización: ${error.message}`, error: error.message });
    }
};


module.exports = { compareData, syncData };
