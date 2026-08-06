// IEEE Trace: REQ-007 | US-006 | authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Role, Privilegio, Contratista, ContratistaUsuario, VinculacionUsuario, PasswordResetToken } = require('../database/models');
const { decryptDataString } = require('../utils/cryptoHelper');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');
const emailService = require('../services/emailService');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

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

            // Sesión única: cada login exitoso emite un nuevo sid y lo persiste en el
            // usuario, invalidando de inmediato cualquier token anterior (local o SSO) de
            // esa misma cuenta — el middleware auth.js rechaza cualquier token cuyo sid no
            // coincida con el vigente, sin importar que su firma/expiración sigan siendo válidas.
            const sessionToken = crypto.randomBytes(32).toString('hex');
            await user.update({ session_token: sessionToken });

            const token = jwt.sign(
                { id: user.usu_id || user.id, email: user.email, role: user.role, sid: sessionToken },
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
            delete userData.session_token;
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

    // POST /api/auth/forgot-password — solo contratista_user. Respuesta SIEMPRE genérica
    // (exista o no la cuenta) para no revelar por esta vía qué correos están registrados.
    async forgotPassword(req, res) {
        const genericResponse = {
            success: true,
            message: 'Si el correo corresponde a una cuenta de contratista registrada, se enviará un enlace de recuperación.'
        };
        try {
            const email = (req.body.email || '').toString().trim().toLowerCase();
            if (!email) {
                return res.status(400).json({ success: false, message: 'El correo es requerido' });
            }

            const user = await User.findOne({ where: { email, role: 'contratista_user' } });
            if (!user || !user.activo) {
                return res.json(genericResponse);
            }

            // Invalidar tokens previos sin usar antes de emitir uno nuevo.
            await PasswordResetToken.update(
                { used_at: new Date() },
                { where: { user_id: user.usu_id, used_at: null } }
            );

            const rawToken = crypto.randomBytes(32).toString('hex');
            await PasswordResetToken.create({
                user_id: user.usu_id,
                token_hash: hashResetToken(rawToken),
                expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS)
            });

            const resetUrl = `${process.env.FRONTEND_URL}/restablecer-password?token=${rawToken}`;
            try {
                await emailService.notifyRecuperacionPassword(user, resetUrl);
            } catch (emailErr) {
                console.error('Error enviando correo de recuperación de contraseña:', emailErr);
            }

            res.json(genericResponse);
        } catch (error) {
            console.error('Forgot password error:', error);
            // Ante un error inesperado seguimos sin revelar información — solo logueamos.
            res.json(genericResponse);
        }
    },

    // GET /api/auth/reset-password/:token — valida el token y entrega el email (para
    // precargar, solo lectura) en la vista de restablecimiento, sin requerir sesión.
    async validateResetToken(req, res) {
        try {
            const { token } = req.params;
            const record = await PasswordResetToken.findOne({
                where: { token_hash: hashResetToken(token || '') }
            });

            if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
                return res.status(400).json({ success: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
            }

            const user = await User.findOne({ where: { usu_id: record.user_id, role: 'contratista_user' } });
            if (!user || !user.activo) {
                return res.status(400).json({ success: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
            }

            res.json({ success: true, email: user.email });
        } catch (error) {
            console.error('Validate reset token error:', error);
            res.status(500).json({ success: false, message: 'Error al validar el enlace de recuperación.' });
        }
    },

    // POST /api/auth/reset-password
    async resetPassword(req, res) {
        try {
            const { token, password, password_confirmation } = req.body;

            if (!token || !password || !password_confirmation) {
                return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
            }

            if (password !== password_confirmation) {
                return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
            }

            const policy = validatePasswordPolicy(password);
            if (!policy.valid) {
                return res.status(400).json({ success: false, message: 'La contraseña no cumple los requisitos mínimos de seguridad.', errors: policy.errors });
            }

            const record = await PasswordResetToken.findOne({
                where: { token_hash: hashResetToken(token) }
            });

            if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
                return res.status(400).json({ success: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
            }

            const user = await User.findOne({ where: { usu_id: record.user_id, role: 'contratista_user' } });
            if (!user || !user.activo) {
                return res.status(400).json({ success: false, message: 'El enlace de recuperación es inválido o ha expirado.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await user.update({ password: hashedPassword });
            await record.update({ used_at: new Date() });

            res.json({ success: true, message: 'Contraseña actualizada correctamente. Ya puede iniciar sesión.' });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ success: false, message: 'Error al restablecer la contraseña.' });
        }
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

            // Autenticación estricta por AMBOS parámetros: el usu_id y el email reportados
            // por OVAL deben coincidir simultáneamente con el MISMO usuario local. Ya no se
            // acepta un match parcial (solo usu_id, o solo email) ni se re-clavija el usu_id
            // automáticamente desde este endpoint — esa homologación sigue existiendo para el
            // proceso de sincronización (usuIdHomologation.js), pero el login SSO exige que la
            // identidad ya esté correctamente homologada de antemano.
            if (!userData.usu_id) {
                console.warn("[SSO] Validación inválida: No se encontró usu_id en la respuesta del SSO");
                return res.status(400).json({
                    success: false,
                    message: 'La respuesta de validación del SSO no contiene un usu_id válido'
                });
            }

            const ssoEmail = userData.email.toString().trim().toLowerCase();
            console.log(`[DB QUERY] Buscando usuario local con usu_id: ${userData.usu_id} Y email: ${ssoEmail}`);
            const user = await User.findOne({
                where: { usu_id: userData.usu_id, email: ssoEmail }
            });
            console.log(`  Resultado: ${user ? `Encontrado (usu_id: ${user.usu_id}, email: ${user.email}, Rol: ${user.role})` : 'No encontrado'}`);

            if (!user) {
                console.warn(`[SSO ACCESS DENIED] Ningún usuario local tiene simultáneamente usu_id=${userData.usu_id} y email=${ssoEmail}.`);
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

            // Sesión única: mismo mecanismo que el login local (ver authController.login) —
            // invalida cualquier token previo de esta cuenta, sea local o SSO.
            const sessionToken = crypto.randomBytes(32).toString('hex');
            await user.update({ session_token: sessionToken });

            const jwtToken = jwt.sign(
                { id: user.usu_id || user.id, email: user.email, role: user.role, sid: sessionToken },
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
            delete userJson.session_token;
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
