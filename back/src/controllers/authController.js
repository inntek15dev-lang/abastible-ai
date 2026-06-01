// IEEE Trace: REQ-007 | US-006 | authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio } = require('../database/models');

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
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            const userData = user.toJSON();
            delete userData.password;

            res.json({
                success: true,
                token,
                user: {
                    ...userData,
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

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'El token de acceso es requerido'
                });
            }

            const isProduction = process.env.NODE_ENV === 'production';
            const pizzaDomain = isProduction 
                ? 'https://ovalcontrol.com' 
                : 'https://prepro.ovalcontrol.com';
            
            const validationUrl = `${pizzaDomain}/api/external-auth/validate`;
            const sharedApiKey = process.env.PIZZA_API_KEY || ''; // Needs to be in .env

            const axios = require('axios');
            
            let pizzaResponse;
            try {
                pizzaResponse = await axios.get(validationUrl, {
                    headers: {
                        'API-KEY': sharedApiKey,
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
            } catch (apiError) {
                console.error('Error validating token with Pizza API:', apiError.message);
                const errorMsg = apiError.response?.data?.error || 'Token de autenticación inválido o expirado.';
                return res.status(401).json({
                    success: false,
                    message: `Error de autenticación SSO: ${errorMsg}`
                });
            }

            const userData = pizzaResponse.data.user;
            if (!userData || !userData.email) {
                return res.status(401).json({
                    success: false,
                    message: 'La respuesta de validación no contiene un usuario válido'
                });
            }

            // Find or create user
            let user = await User.findOne({ where: { email: userData.email } });

            if (!user) {
                // Register user locally
                user = await User.create({
                    email: userData.email,
                    name: userData.nombre,
                    usuario: userData.usuario,
                    usu_id_pizza: userData.usu_id,
                    password: bcrypt.hashSync(require('crypto').randomBytes(16).toString('hex'), 10),
                    role: 'contratista_admin', // Default role based on existing app logic or requirements
                    activo: 1
                });
            } else {
                // Update specific data if missing or needed
                let updated = false;
                if (!user.usu_id_pizza && userData.usu_id) {
                    user.usu_id_pizza = userData.usu_id;
                    updated = true;
                }
                if (!user.usuario && userData.usuario) {
                    user.usuario = userData.usuario;
                    updated = true;
                }
                if (updated) {
                    await user.save();
                }
            }

            if (!user.activo) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario desactivado'
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

            const jwtToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            const userJson = user.toJSON();
            delete userJson.password;

            res.json({
                success: true,
                token: jwtToken,
                user: {
                    ...userJson,
                    privileges
                }
            });
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
