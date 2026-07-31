const axios = require('axios');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion, User, Administracion, Gerencia, Subgerencia, ContratistaUsuario } = require('../database/models');
const { adoptOvalUsuId, nextLocalUsuId, isProtectedEmail } = require('../utils/usuIdHomologation');
const {
    DEMO_CONTRATISTA_RUT, DEMO_GERENCIA, DEMO_SUBGERENCIA, DEMO_SERVICIO, DEMO_DEPENDENCIA
} = require('../utils/demoScaffold');

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
    // normalize('NFC'): OVAL env\u00EDa el mismo car\u00E1cter acentuado (ej. "\u00D1") con distinta
    // composici\u00F3n Unicode seg\u00FAn el registro/origen (precompuesto vs. compuesto por
    // combinaci\u00F3n) \u2014 visualmente id\u00E9nticos pero con bytes distintos. Sin esto, dos
    // strings que se ven iguales no son === iguales, causando que una vinculaci\u00F3n se
    // cree con una codificaci\u00F3n y la comparaci\u00F3n de residuales use otra, generando un
    // ciclo de crear+podar en cada full-sync.
    return str.toString().normalize('NFC').replace(/[\u00A0\u200B\r\n\t]/g, ' ').trim();
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

// Sequelize reduce err.message a "Validation error"/"Validation error" genérico para
// SequelizeValidationError y SequelizeUniqueConstraintError — el detalle real (qué campo,
// qué constraint) vive en err.errors (validación de atributos) o err.original (motor SQL).
// Sin esto, cualquier warning/failedItem queda ilegible ("email: Validation error").
const extractErrorDetail = (err) => {
    if (err?.original?.message) return err.original.message;
    if (Array.isArray(err?.errors) && err.errors.length > 0) {
        return err.errors.map(e => `${e.path}: ${e.message} (valor: ${JSON.stringify(e.value)})`).join('; ');
    }
    return err?.message || String(err);
};

const extractContractorInfo = (item, fallbackName = '') => {
    if (!item) {
        // DIAGNÓSTICO (temporal): rastreando el origen del contratista fantasma 99999999-9
        // que reaparece en cada full-sync (ver memoria del proyecto / conversación).
        console.warn('🔎 [DIAGNOSTICO RUT-FALLBACK] extractContractorInfo recibió item null/undefined. fallbackName:', fallbackName);
        return { rut: '99999999-9', nombre: fallbackName || 'Empresa Sincronizada' };
    }
    if (typeof item === 'string') return { rut: item, nombre: fallbackName || item };

    let rawRut = item.rut || item.rut_contratista;
    if (!rawRut && item.cot_rut) {
        rawRut = item.cot_dv !== undefined && item.cot_dv !== null && item.cot_dv !== ''
            ? `${item.cot_rut}-${item.cot_dv}`
            : item.cot_rut.toString();
    }
    const rut = sanitizeString(rawRut) || '99999999-9';
    if (rut === '99999999-9') {
        // DIAGNÓSTICO (temporal): ídem arriba. Imprime el item completo (truncado) para
        // identificar exactamente qué registro de OVAL no trae un RUT resoluble.
        console.warn('🔎 [DIAGNOSTICO RUT-FALLBACK] No se pudo determinar un RUT válido. fallbackName:', fallbackName, '| item recibido:', JSON.stringify(item).slice(0, 800));
    }
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
        const warnings = [];

        // Poda resiliente: elimina residuales UNO POR UNO. Si una FK física no rastreada
        // en el código bloquea un registro puntual (ya ocurrió con
        // contratista_asignaciones_ibfk_2 al podar servicios), se reporta como advertencia
        // y se sigue con el resto, en vez de abortar todo el request con un 500.
        const pruneOneByOne = async (tipo, targets, destroyFn, describeFn) => {
            for (const target of targets) {
                try {
                    await destroyFn(target);
                    prunedItems.push({ tipo, ...describeFn(target) });
                } catch (err) {
                    console.warn(`⚠️ No se pudo podar residual de ${tipo}:`, err.message);
                    warnings.push({ tipo: `poda_${tipo}`, ...describeFn(target), error: extractErrorDetail(err) });
                }
            }
        };

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

        // Resuelve (o crea) el usuario local homologado. El usu_id de Oval es autoritativo:
        // si el usuario existe con otro usu_id se re-homologa con cascada de referencias;
        // si Oval no envía usu_id se usa el usuario por email o se crea uno del rango local.
        const resolveHomologatedUser = async ({ cleanEmail, cleanName, role, extraDefaults = {}, ovalUsuId, transaction }) => {
            // Guard incondicional, ANTES de mirar si Oval mandó usu_id o no: si Oval no
            // envía usu_id para este ítem, el código caía a un lookup directo por email
            // que saltaba por completo la protección de adoptOvalUsuId, permitiendo
            // sobrescribir una cuenta fija del sistema con solo coincidir el email.
            if (isProtectedEmail(cleanEmail)) {
                throw new Error(`${cleanEmail} es una cuenta fija del sistema; OVAL nunca puede modificarla.`);
            }

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
                console.warn(`⚠️ Granular sync warning on item (${JSON.stringify(item.rut || item.nombre || item.email || item).slice(0, 100)}):`, extractErrorDetail(err));
                failedItems.push({
                    item: item,
                    error: err.message,
                    details: extractErrorDetail(err)
                });
            }
        };

        // Entidades taxonómicas (Gerencia/Subgerencia/Servicio/Dependencia): aunque no
        // tienen data operativa colgando de su ID de forma directa en la mayoría de los
        // casos, Registro.dependencia_id SÍ referencia directamente Dependencia.id (fuera
        // del flujo de sync, Registro nunca se vuelve a tocar). Un DELETE+INSERT real
        // dejaría ese FK apuntando a un id inexistente para siempre. Por eso "eliminar y
        // crear" se implementa como sobrescritura total preservando el ID/fila, igual que
        // Contratista/Vinculación/Usuario: mismo resultado observable, sin ese riesgo.
        const syncSingleGerencia = async (item, transaction) => {
            const gName = sanitizeString(item.nombre) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, defaults: { activo: 1 }, transaction });
            await gerencia.update({ activo: 1 }, { transaction });
            return gerencia;
        };

        const syncSingleSubgerencia = async (item, transaction) => {
            const sName = sanitizeString(item.nombre) || 'SUBGERENCIA GENERAL';
            const gName = sanitizeString(item.gerencia) || 'GERENCIA GENERAL';
            const [gerencia] = await Gerencia.findOrCreate({ where: { nombre: gName }, transaction });
            const [subgerencia] = await Subgerencia.findOrCreate({ where: { nombre: sName, gerencia_id: gerencia.id }, defaults: { activo: 1 }, transaction });
            await subgerencia.update({ activo: 1 }, { transaction });
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
            // programa_id se preserva siempre: es una asociación funcional local (qué
            // programa de cumplimiento aplica a este servicio) que OVAL no envía.
            await servicio.update({ descripcion: servicio.descripcion || 'Sincronizado desde API', activo: 1 }, { transaction });
            return servicio;
        };

        const syncSingleDependencia = async (item, transaction) => {
            const dName = sanitizeString(item.nombre) || 'OFICINA CENTRAL';
            const [dependencia] = await Dependencia.findOrCreate({ where: { nombre: dName }, defaults: { activo: 1 }, transaction });
            // subgerencia_id se preserva siempre: relación local que OVAL no envía en su
            // payload plano. Registro.dependencia_id referencia este id directamente, por
            // lo que jamás se puede recrear con un id nuevo mientras siga en OVAL.
            await dependencia.update({ activo: 1 }, { transaction });
            return dependencia;
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
                // DIAGNÓSTICO (temporal): rastreando el origen del contratista fantasma
                // 99999999-9 que reaparece en cada full-sync.
                console.warn('🔎 [DIAGNOSTICO RUT-FALLBACK] syncSingleContratistaAdmin: rut_contratistas vacío/inválido para', cleanEmail, '| item completo:', JSON.stringify(item).slice(0, 800));
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
                // El scaffold demo (nunca reportado por OVAL) jamás es residual.
                const stale = local.filter(g => !target.has(normalize(g.nombre)) && normalize(g.nombre) !== normalize(DEMO_GERENCIA));
                await pruneOneByOne('gerencias', stale, (g) => g.destroy(), (g) => ({ id: g.id, nombre: g.nombre }));
            }
        } else if (type === 'subgerencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleSubgerencia);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(`${i.gerencia}|${i.nombre}`)));
                const local = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
                const stale = local.filter(s => !target.has(normalize(`${s.gerencia ? s.gerencia.nombre : ''}|${s.nombre}`)) && normalize(s.nombre) !== normalize(DEMO_SUBGERENCIA));
                await pruneOneByOne('subgerencias', stale, (s) => s.destroy(), (s) => ({ id: s.id, nombre: s.nombre, gerencia: s.gerencia ? s.gerencia.nombre : null }));
            }
        } else if (type === 'servicios') {
            for (const item of items) {
                await processGranularItem(item, syncSingleServicio);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(`${i.subgerencia}|${i.nombre}`)));
                const local = await TipoContratista.findAll({ include: [{ model: Subgerencia, as: 'subgerencia' }] });
                const stale = local.filter(s => !target.has(normalize(`${s.subgerencia ? s.subgerencia.nombre : ''}|${s.nombre}`)) && normalize(s.nombre) !== normalize(DEMO_SERVICIO));
                await pruneOneByOne('servicios', stale, (s) => s.destroy(), (s) => ({ id: s.id, nombre: s.nombre, subgerencia: s.subgerencia ? s.subgerencia.nombre : null }));
            }
        } else if (type === 'dependencias') {
            for (const item of items) {
                await processGranularItem(item, syncSingleDependencia);
            }
            if (mirror) {
                const target = new Set(items.map(i => normalize(i.nombre)));
                const local = await Dependencia.findAll();
                const stale = local.filter(d => !target.has(normalize(d.nombre)) && normalize(d.nombre) !== normalize(DEMO_DEPENDENCIA));
                await pruneOneByOne('dependencias', stale, (d) => d.destroy(), (d) => ({ id: d.id, nombre: d.nombre }));
            }
        } else if (type === 'contratistas') {
            // First sync the contractor master entity
            for (const item of items) {
                await processGranularItem(item, async (contractorItem, transaction) => {
                    const contractor = await syncSingleContratista(contractorItem, transaction);

                    if (cleanRutString(contractor.rut) === cleanRutString('99999999-9')) {
                        // DIAGNÓSTICO (temporal): capturar el ítem completo (incluidas sus
                        // asignaciones) que resolvió al RUT fantasma, para identificar la
                        // empresa/dato de origen real en OVAL.
                        console.warn('🔎 [DIAGNOSTICO RUT-FALLBACK] Ítem de "contratistas" resolvió al RUT fantasma 99999999-9. contractorItem completo:', JSON.stringify(contractorItem).slice(0, 1500));
                    }

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
                                warnings.push({
                                    tipo: 'vinculacion',
                                    rut: contractor.rut,
                                    contratista: contractor.nombre,
                                    servicio: asig.servicio,
                                    dependencia: asig.dependencia,
                                    subgerencia: asig.subgerencia,
                                    gerencia: asig.gerencia,
                                    numero_contrato: asig.contrato || asig.numero_contrato || null,
                                    error: extractErrorDetail(vErr)
                                });
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
                                            warnings.push({
                                                tipo: 'administrador_contrato',
                                                rut: contractor.rut,
                                                contratista: contractor.nombre,
                                                nombre: adminItem.nombre,
                                                email: adminEmail,
                                                servicio: asig.servicio,
                                                dependencia: asig.dependencia,
                                                subgerencia: asig.subgerencia,
                                                gerencia: asig.gerencia,
                                                numero_contrato: asig.contrato || null,
                                                error: extractErrorDetail(aErr)
                                            });
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
                        const staleVincIds = (await Vinculacion.findAll({ where: pruneWhere, attributes: ['id'], transaction })).map(v => v.id);
                        if (staleVincIds.length > 0) {
                            await Administracion.destroy({ where: { vinculacion_id: staleVincIds }, transaction });
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
                                    warnings.push({
                                        tipo: 'contratista_admin',
                                        rut: contractor.rut,
                                        contratista: contractor.nombre,
                                        nombre: cAdminItem.nombre,
                                        email: cleanEmail,
                                        error: extractErrorDetail(caErr)
                                    });
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
                // La empresa demo (RUT sintético, nunca reportado por OVAL) jamás es residual.
                const stale = local.filter(c => !target.has(cleanRutString(c.rut)) && cleanRutString(c.rut) !== cleanRutString(DEMO_CONTRATISTA_RUT));
                if (stale.length > 0) {
                    // DIAGNÓSTICO (temporal): rastreando el origen del contratista fantasma
                    // 99999999-9 que reaparece en cada full-sync.
                    for (const c of stale) {
                        const vincCount = await Vinculacion.count({ where: { contratista_id: c.id } });
                        console.warn(`🔎 [DIAGNOSTICO RUT-FALLBACK] Contratista residual a eliminar: id=${c.id} rut="${c.rut}" nombre="${c.nombre}" activo=${c.activo} vinculaciones_asociadas=${vincCount}`);
                    }
                }
                await pruneOneByOne('contratistas', stale, async (c) => {
                    // Limpieza explícita en código, sin depender de FK física: la FK
                    // contratista_usuarios.contratista_id -> contratistas.id (ON DELETE
                    // CASCADE) se elimina en el deploy (scripts/drop_physical_foreign_keys.js),
                    // así que si no se borra aquí, ContratistaUsuario quedaría huérfano.
                    await ContratistaUsuario.destroy({ where: { contratista_id: c.id } });
                    const vincIds = (await Vinculacion.findAll({ where: { contratista_id: c.id }, attributes: ['id'] })).map(v => v.id);
                    if (vincIds.length > 0) {
                        await Administracion.destroy({ where: { vinculacion_id: vincIds } });
                    }
                    await Vinculacion.destroy({ where: { contratista_id: c.id } });
                    await c.destroy();
                }, (c) => ({ id: c.id, rut: c.rut, nombre: c.nombre }));
            }
        } else if (type === 'contratista_admin') {
            // Ítems agregados por email = estado completo del usuario en OVAL => se poda
            for (const item of items) {
                await processGranularItem(item, (it, tx) => syncSingleContratistaAdmin(it, tx, { prune: true }));
            }
            if (mirror) {
                const target = new Set(items.filter(i => i.usu_id != null).map(i => Number(i.usu_id)));
                const local = await User.findAll({ where: { role: 'contratista_admin' } });
                // Las cuentas fijas del sistema (seed.js) nunca son residuales, aunque su
                // usu_id nunca vaya a coincidir con el rango real de OVAL — mismo guard que
                // adoptOvalUsuId, pero aplicado aquí porque la poda es una consulta aparte.
                const stale = local.filter(u => u.usu_id != null && !target.has(Number(u.usu_id)) && !isProtectedEmail(u.email));
                await pruneOneByOne('contratista_admin', stale, async (u) => {
                    await ContratistaUsuario.destroy({ where: { user_id: u.usu_id } });
                    await u.destroy();
                }, (u) => ({ usu_id: u.usu_id, email: u.email, nombre: u.name }));
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
                    // La vinculación demo (empresa de RUT sintético) jamás es residual.
                    if (cleanRutString(v.contratista.rut) === cleanRutString(DEMO_CONTRATISTA_RUT)) return false;
                    const key = `${cleanRutString(v.contratista.rut)}|${normalize(v.servicio.nombre)}|${normalize(v.dependencia.nombre)}|${normalize(v.subgerencia.nombre)}|${normalize(v.gerencia.nombre)}`;
                    return !target.has(key);
                });
                if (stale.length > 0) {
                    // DIAGNÓSTICO (temporal): a qué empresa/contrato pertenecían realmente
                    // las vinculaciones marcadas como residuales, antes de eliminarlas.
                    console.warn(`🔎 [DIAGNOSTICO RUT-FALLBACK] ${stale.length} vinculación(es) residual(es) a eliminar (de ${local.length} locales, contra ${target.size} claves objetivo de OVAL):`);
                    // DIAGNÓSTICO (temporal): mapa auxiliar por RUT con TODAS las combinaciones
                    // crudas (sin normalizar) que OVAL envió, para comparar campo a campo contra
                    // la fila local y detectar diferencias invisibles (acentos, espacios, etc).
                    const itemsByRutDiag = new Map();
                    items.forEach(i => {
                        const infoDiag = extractContractorInfo({ rut: i.rut_contratista, nombre: i.contratista, cot_rut: i.cot_rut, cot_dv: i.cot_dv, cot_razon_social: i.cot_razon_social });
                        const crDiag = cleanRutString(infoDiag.rut);
                        if (!itemsByRutDiag.has(crDiag)) itemsByRutDiag.set(crDiag, []);
                        itemsByRutDiag.get(crDiag).push(i);
                    });
                    const codePoints = (s) => (s || '').toString().split('').map(c => c.codePointAt(0)).join(',');
                    for (const v of stale) {
                        console.warn(`   - id=${v.id} rut="${v.contratista.rut}" contratista="${v.contratista.nombre}" servicio="${v.servicio.nombre}" dependencia="${v.dependencia.nombre}" subgerencia="${v.subgerencia.nombre}" gerencia="${v.gerencia.nombre}" numero_contrato="${v.numero_contrato}"`);
                        console.warn(`     >> [codepoints] servicio=[${codePoints(v.servicio.nombre)}] dependencia=[${codePoints(v.dependencia.nombre)}] subgerencia=[${codePoints(v.subgerencia.nombre)}] gerencia=[${codePoints(v.gerencia.nombre)}]`);
                        const candidatos = itemsByRutDiag.get(cleanRutString(v.contratista.rut)) || [];
                        console.warn(`     >> combos esperados por OVAL para este RUT (${candidatos.length}):`);
                        candidatos.forEach((c, idx) => {
                            console.warn(`        [${idx}] servicio="${c.servicio}" [${codePoints(c.servicio)}] dependencia="${c.dependencia}" [${codePoints(c.dependencia)}] subgerencia="${c.subgerencia}" [${codePoints(c.subgerencia)}] gerencia="${c.gerencia}" [${codePoints(c.gerencia)}] contrato="${c.contrato || c.numero_contrato}"`);
                        });
                    }
                }
                await pruneOneByOne('vinculaciones', stale, async (v) => {
                    await Administracion.destroy({ where: { vinculacion_id: v.id } });
                    await v.destroy();
                }, (v) => ({
                    id: v.id,
                    rut: v.contratista ? v.contratista.rut : null,
                    contratista: v.contratista ? v.contratista.nombre : null,
                    servicio: v.servicio ? v.servicio.nombre : null,
                    dependencia: v.dependencia ? v.dependencia.nombre : null,
                    subgerencia: v.subgerencia ? v.subgerencia.nombre : null,
                    gerencia: v.gerencia ? v.gerencia.nombre : null,
                    numero_contrato: v.numero_contrato
                }));
            }
        } else if (type === 'administrador_contrato') {
            // Ítems agregados por email = portafolio completo del ADC en OVAL => se poda
            for (const item of items) {
                await processGranularItem(item, (it, tx) => syncSingleAdministradorContrato(it, tx, { prune: true }));
            }
            if (mirror) {
                const target = new Set(items.filter(i => i.usu_id != null).map(i => Number(i.usu_id)));
                const local = await User.findAll({ where: { role: 'administrador_contrato' } });
                // Ver comentario equivalente en la poda de contratista_admin más arriba.
                const stale = local.filter(u => u.usu_id != null && !target.has(Number(u.usu_id)) && !isProtectedEmail(u.email));
                await pruneOneByOne('administrador_contrato', stale, async (u) => {
                    await Administracion.destroy({ where: { administrador_contrato_id: u.usu_id } });
                    await u.destroy();
                }, (u) => ({ usu_id: u.usu_id, email: u.email, nombre: u.name }));
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
