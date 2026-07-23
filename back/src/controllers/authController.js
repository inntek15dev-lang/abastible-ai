// IEEE Trace: REQ-007 | US-006 | authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio, Contratista, ContratistaUsuario, VinculacionUsuario } = require('../database/models');
const { decryptDataString } = require('../utils/cryptoHelper');

const authController = {
    // POST /api/auth/login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email y contraseña son requeridos'
                });
            }

            const user = await User.findOne({ where: { email } });

            console.log('Login attempt:', email);
            if (!user) {
                console.log('User not found');
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            if (!user.activo) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario desactivado'
                });
            }

            if (!user.password) {
                console.log('User password is null or missing in database');
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            const pwdString = String(password);
            console.log(`Password check: Input length=${pwdString.length}, Hash length=${user.password.length}`);
            console.log(`Input chars: ${pwdString.split('').map(c => c.charCodeAt(0)).join(',')}`);

            const validPassword = await bcrypt.compare(pwdString, user.password);
            console.log('Bcrypt result:', validPassword);

            if (!validPassword) {
                console.log('Password mismatch');
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Load privileges
            const role = await Role.findOne({ where: { name: user.role } });
            let privileges = [];

            if (role) {
                const privs = await Privilegio.findAll({ where: { role_id: role.id } });
                privileges = privs.map(p => ({
                    module: p.ref_modulo,
                    read: p.read === 1,
                    write: p.write === 1,
                    excec: p.excec === 1
                }));
            }

            if (!process.env.JWT_SECRET) {
                console.error('CRITICAL: JWT_SECRET is not defined');
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor (JWT)'
                });
            }

            const token = jwt.sign(
                { id: user.usu_id || user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // Retrieve multiple assigned contractors (for contratista_admin many-to-many relationship)
            const assigned = await ContratistaUsuario.findAll({
                where: { user_id: user.usu_id || user.id },
                attributes: ['contratista_id']
            });
            const contratistaIds = [...new Set(assigned.map(c => Number(c.contratista_id)))];
            if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
                contratistaIds.push(Number(user.contratista_id));
            }

            // Load vinculacion_id for contratista_user
            let vinculacion_id = null;
            if (user.role === 'contratista_user') {
                const vu = await VinculacionUsuario.findOne({
                    where: { user_id: user.usu_id || user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                vinculacion_id = vu ? Number(vu.vinculacion_id) : null;
            }

            const userData = user.toJSON();
            delete userData.password;
            userData.id = user.usu_id || user.id; // Map id to usu_id with fallback to legacy id

            res.json({
                success: true,
                token,
                user: {
                    ...userData,
                    contratista_ids: contratistaIds,
                    vinculacion_id,
                    privileges
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    },

    // GET /api/auth/me
    async me(req, res) {
        try {
            res.json({
                success: true,
                user: req.user
            });
        } catch (error) {
            console.error('Me error:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    },

    // POST /api/auth/logout
    async logout(req, res) {
        // JWT is stateless, logout is handled client-side
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    },

    // POST /api/auth/login-external
    async loginExternal(req, res) {
        try {
            const { token } = req.body;

            console.log("\n=================== [INICIO ACCESO EXTERNO SSO] ===================");
            console.log(`[SSO] Token recibido en request body: ${token ? token.substring(0, 30) + '...' : '(nulo)'} (longitud: ${token ? token.length : 0})`);

            if (!token) {
                console.warn("[SSO] Solicitud rechazada: Falta el token de acceso.");
                return res.status(400).json({
                    success: false,
                    message: 'El token de acceso es requerido'
                });
            }

            // Intentar desencriptar el token para ver la data recibida
            try {
                const decryptedData = decryptDataString(token);
                console.log("[SSO] Data del token desencriptada:");
                console.log(JSON.stringify(decryptedData, null, 2));
            } catch (decError) {
                console.error("[SSO] Error al intentar desencriptar el token recibido:", decError.message);
            }

            const isProduction = process.env.NODE_ENV === 'production';
            const pizzaDomain = isProduction 
                ? 'https://ovalcontrol.com' 
                : 'https://prepro.ovalcontrol.com';
            
            const validationUrl = `${pizzaDomain}/api/external-auth/validate`;
            const sharedApiKey = process.env.EXTERNAL_API_KEY || ''; // Needs to be in .env

            const axios = require('axios');
            
            let pizzaResponse;
            try {
                console.log(`[SSO API CALL] -> Solicitando validación a Pizza API`);
                console.log(`  URL: ${validationUrl}`);
                console.log(`  Headers:`);
                console.log(`    API-KEY: ${sharedApiKey ? '***' : '(vacío)'}`);
                console.log(`    Authorization: Bearer ${token.substring(0, 20)}...`);

                pizzaResponse = await axios.get(validationUrl, {
                    headers: {
                        'API-KEY': sharedApiKey,
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                console.log(`[SSO API RESPONSE] <- Respuesta exitosa de Pizza API (Status: ${pizzaResponse.status})`);
                console.log(`  Datos de Respuesta:`, JSON.stringify(pizzaResponse.data, null, 2));
            } catch (apiError) {
                console.error('[SSO API RESPONSE] <- Error al validar token con Pizza API:', apiError.message);
                if (apiError.response) {
                    console.error(`  Status de Error: ${apiError.response.status}`);
                    console.error(`  Datos de Error:`, JSON.stringify(apiError.response.data, null, 2));
                }
                const errorMsg = apiError.response?.data?.error || 'Token de autenticación inválido o expirado.';
                return res.status(401).json({
                    success: false,
                    message: `Error de autenticación SSO: ${errorMsg}`
                });
            }

            const userData = pizzaResponse.data.user;
            if (!userData || !userData.email) {
                console.warn("[SSO] Validación inválida: No se encontró userData o email en la respuesta");
                return res.status(401).json({
                    success: false,
                    message: 'La respuesta de validación no contiene un usuario válido'
                });
            }

            console.log(`[SSO USER DATA] Usuario validado: ${userData.email}`);

            // Map external role to internal role
            let mappedRole = 'contratista_admin'; // default fallback
            const extRol = userData.rol;
            if (extRol) {
                const extRolLower = extRol.toLowerCase();
                if (extRolLower === 'administrador') {
                    mappedRole = 'admin';
                } else if (extRolLower === 'admin_contratos' || extRolLower === 'admin_contrato') {
                    mappedRole = 'administrador_contrato';
                } else if (extRolLower === 'contratista') {
                    mappedRole = 'contratista_admin';
                }
            }
            console.log(`[SSO ROL MAPPING] Rol externo: "${extRol}" -> Rol interno mapeado: "${mappedRole}"`);

            // Find user strictly by usu_id
            let user = null;
            if (userData.usu_id) {
                console.log(`[DB QUERY] Buscando usuario existente con usu_id: ${userData.usu_id}`);
                user = await User.findOne({
                    where: { usu_id: userData.usu_id }
                });
            } else {
                console.warn("[SSO] Validación inválida: No se encontró usu_id en la respuesta del SSO");
                return res.status(400).json({
                    success: false,
                    message: 'La respuesta de validación del SSO no contiene un usu_id válido'
                });
            }
            console.log(`  Resultado: ${user ? `Encontrado (usu_id: ${user.usu_id}, Rol: ${user.role})` : 'No encontrado'}`);

            if (!user) {
                console.warn(`[SSO ACCESS DENIED] Usuario con usu_id ${userData.usu_id} no está registrado en el sistema local.`);
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no registrado en el sistema. Contacte al administrador.'
                });
            }

            // Resolve and assign contractor if role is contratista_admin
            let firstContratistaId = null;
            let firstEeccNombre = null;
            let resolvedContractorIds = [];

            if (mappedRole === 'contratista_admin') {
                const cleanRutString = (rut) => {
                    if (!rut) return '';
                    return String(rut).toUpperCase().replace(/[^0-9K]/g, '');
                };

                const rutContratista = userData.rut_contratista || userData.contratista_rut || userData.rut_empresa || userData.eecc_rut || userData.cot_rut;
                const nombreContratista = userData.eecc_nombre || userData.contratista_nombre || userData.nombre_contratista || userData.empresa || userData.contratista || userData.cot_razon_social || userData.razon_social;

                let resolvedContractors = [];
                if (Array.isArray(userData.contratistas)) {
                    for (const c of userData.contratistas) {
                        const rut = c.rut || c.rut_contratista || c.contratista_rut;
                        const nombre = c.nombre || c.eecc_nombre || c.contratista_nombre;
                        if (rut) {
                            resolvedContractors.push({ rut, nombre });
                        }
                    }
                } else if (rutContratista) {
                    resolvedContractors.push({ rut: rutContratista, nombre: nombreContratista });
                }

                console.log(`[SSO CONTRATISTAS RESOLVE] Resolviendo contratistas para asociar. Candidatos:`, JSON.stringify(resolvedContractors, null, 2));

                const contratistas = await Contratista.findAll();
                console.log(`[DB QUERY] Cargados ${contratistas.length} contratistas de la base de datos.`);

                for (const rc of resolvedContractors) {
                    const cleanExtRut = cleanRutString(rc.rut);
                    let contratista = contratistas.find(c => cleanRutString(c.rut) === cleanExtRut);

                    if (!contratista) {
                        console.log(`[DB WRITE] -> Creando nueva contratista por no existir RUT: ${rc.rut}`);
                        const payload = {
                            rut: rc.rut,
                            nombre: rc.nombre || `Contratista ${rc.rut}`,
                            activo: 1
                        };
                        console.log(`  Payload:`, JSON.stringify(payload, null, 2));
                        contratista = await Contratista.create(payload);
                        console.log(`  Response (Creado):`, JSON.stringify(contratista.toJSON(), null, 2));
                    } else if (rc.nombre && contratista.nombre !== rc.nombre && rc.nombre !== rc.rut) {
                        console.log(`[DB WRITE] -> Actualizando nombre de contratista ID: ${contratista.id}`);
                        const payload = { nombre: rc.nombre };
                        console.log(`  Payload:`, JSON.stringify(payload, null, 2));
                        await contratista.update(payload);
                        console.log(`  Response (Actualizado):`, JSON.stringify(contratista.toJSON(), null, 2));
                    } else {
                        console.log(`[DB INFO] Contratista ya existe y está al día: ID: ${contratista.id}, RUT: ${contratista.rut}, Nombre: ${contratista.nombre}`);
                    }

                    resolvedContractorIds.push(contratista.id);
                    if (!firstContratistaId) {
                        firstContratistaId = contratista.id;
                        firstEeccNombre = contratista.nombre;
                    }
                }
            }

            // Update specific data if missing or needed
            let updated = false;
            const updatePayload = {};

            if (!user.usu_id && userData.usu_id) {
                user.usu_id = userData.usu_id;
                updatePayload.usu_id = userData.usu_id;
                updated = true;
            }
            if (!user.usuario && userData.usuario) {
                user.usuario = userData.usuario;
                updatePayload.usuario = userData.usuario;
                updated = true;
            }
            if (user.role !== mappedRole) {
                user.role = mappedRole;
                updatePayload.role = mappedRole;
                updated = true;
            }
            if (firstContratistaId && user.contratista_id !== firstContratistaId) {
                user.contratista_id = firstContratistaId;
                updatePayload.contratista_id = firstContratistaId;
                updated = true;
            }
            if (firstEeccNombre && user.eecc_nombre !== firstEeccNombre) {
                user.eecc_nombre = firstEeccNombre;
                updatePayload.eecc_nombre = firstEeccNombre;
                updated = true;
            }

            if (updated) {
                console.log(`[DB WRITE] -> Actualizando usuario existente (usu_id: ${user.usu_id})`);
                console.log(`  Payload de cambios:`, JSON.stringify(updatePayload, null, 2));
                await user.save();
                console.log(`  Response (Actualizado):`, JSON.stringify(user.toJSON(), null, 2));
            } else {
                console.log(`[DB INFO] Usuario existente al día (usu_id: ${user.usu_id}), no requiere actualización.`);
            }

            // Sincronizar tabla de muchos a muchos contratista_usuarios
            if (mappedRole === 'contratista_admin' && resolvedContractorIds.length > 0) {
                console.log(`[DB WRITE] -> Sincronizando tabla intermedia ContratistaUsuario para usuario ID: ${user.id}`);
                console.log(`  Eliminando asociaciones previas...`);
                await ContratistaUsuario.destroy({ where: { user_id: user.id } });

                const assocData = resolvedContractorIds.map(cId => ({
                    user_id: user.id,
                    contratista_id: cId
                }));
                console.log(`  Creando nuevas asociaciones. Payload:`, JSON.stringify(assocData, null, 2));
                const bulkRes = await ContratistaUsuario.bulkCreate(assocData);
                console.log(`  Response: Asociadas ${bulkRes.length} contratistas con éxito.`);
            }

            if (!user.activo) {
                console.warn(`[SSO ACCESS DENIED] Usuario desactivado (ID: ${user.id}, Email: ${user.email})`);
                return res.status(401).json({
                    success: false,
                    message: 'Usuario desactivado'
                });
            }

            // Load privileges
            console.log(`[DB QUERY] Cargando privilegios para rol: ${user.role}`);
            const role = await Role.findOne({ where: { name: user.role } });
            let privileges = [];

            if (role) {
                const privs = await Privilegio.findAll({ where: { role_id: role.id } });
                privileges = privs.map(p => ({
                    module: p.ref_modulo,
                    read: p.read === 1,
                    write: p.write === 1,
                    excec: p.excec === 1
                }));
            }
            console.log(`  Privilegios cargados:`, JSON.stringify(privileges, null, 2));

            if (!process.env.JWT_SECRET) {
                console.error('CRITICAL: JWT_SECRET is not defined');
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor (JWT)'
                });
            }

            const jwtToken = jwt.sign(
                { id: user.usu_id || user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // Retrieve multiple assigned contractors (for contratista_admin many-to-many relationship)
            console.log(`[DB QUERY] Obteniendo todos los IDs de contratistas vinculados al usuario usu_id: ${user.usu_id || user.id}`);
            const assigned = await ContratistaUsuario.findAll({
                where: { user_id: user.usu_id || user.id },
                attributes: ['contratista_id']
            });
            const contratistaIds = [...new Set(assigned.map(c => Number(c.contratista_id)))];
            if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
                contratistaIds.push(Number(user.contratista_id));
            }
            console.log(`  IDs de contratistas vinculados final:`, contratistaIds);

            // Load vinculacion_id for contratista_user (SSO login)
            let ssoVinculacionId = null;
            if (user.role === 'contratista_user') {
                const vu = await VinculacionUsuario.findOne({
                    where: { user_id: user.usu_id || user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                ssoVinculacionId = vu ? Number(vu.vinculacion_id) : null;
                console.log(`  vinculacion_id para contratista_user:`, ssoVinculacionId);
            }

            const userJson = user.toJSON();
            delete userJson.password;
            userJson.id = user.usu_id || user.id; // Map id to usu_id with fallback to legacy id

            const finalResponse = {
                success: true,
                token: jwtToken,
                user: {
                    ...userJson,
                    contratista_ids: contratistaIds,
                    vinculacion_id: ssoVinculacionId,
                    privileges
                }
            };
            console.log(`[SSO LOGIN SUCCESS] Acceso externo completado exitosamente para: ${user.email}`);
            console.log("=================== [FIN ACCESO EXTERNO SSO] ===================\n");

            res.json(finalResponse);
        } catch (error) {
            console.error('Login external error:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor de autenticación.'
            });
        }
    }
};

module.exports = authController;
