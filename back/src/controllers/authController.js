// IEEE Trace: REQ-007 | US-006 | authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize, User, Role, Privilegio, Contratista, ContratistaUsuario, VinculacionUsuario } = require('../database/models');
const { decryptDataString } = require('../utils/cryptoHelper');
const { adoptOvalUsuId } = require('../utils/usuIdHomologation');

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

            // Fallback de homologación: si no existe por usu_id pero sí por email,
            // se adopta el usu_id de Oval (autoritativo) re-apuntando las referencias.
            if (!user && userData.email) {
                const fallbackEmail = userData.email.toString().trim().toLowerCase();
                const byEmail = await User.findOne({ where: { email: fallbackEmail } });
                if (byEmail) {
                    console.log(`[SSO HOMOLOGACIÓN] Usuario encontrado por email (${fallbackEmail}); adoptando usu_id ${userData.usu_id} de Oval (local actual: ${byEmail.usu_id}).`);
                    const t = await sequelize.transaction();
                    try {
                        user = await adoptOvalUsuId({
                            sequelize,
                            User,
                            email: byEmail.email,
                            targetUsuId: userData.usu_id,
                            transaction: t
                        });
                        await t.commit();
                    } catch (homologErr) {
                        await t.rollback();
                        console.error(`[SSO HOMOLOGACIÓN] No se pudo adoptar usu_id ${userData.usu_id} para ${fallbackEmail}:`, homologErr.message);
                        user = null;
                    }
                }
            }

            if (!user) {
                console.warn(`[SSO ACCESS DENIED] Usuario con usu_id ${userData.usu_id} no está registrado en el sistema local.`);
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no registrado en el sistema. Contacte al administrador.'
                });
            }

            if (!user.activo) {
                console.warn(`[SSO ACCESS DENIED] Usuario desactivado (ID: ${user.usu_id || user.id}, Email: ${user.email})`);
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
