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

            const { decryptDataString } = require('../utils/cryptoHelper');
            const decrypted = decryptDataString(token);
            if (!decrypted) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de acceso inválido o corrupto'
                });
            }

            const email = decrypted.email || decrypted.mail || decrypted.usuario;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'El token no contiene un email o identificador de usuario válido'
                });
            }

            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'El usuario no está registrado en el sistema'
                });
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

            const userData = user.toJSON();
            delete userData.password;

            res.json({
                success: true,
                token: jwtToken,
                user: {
                    ...userData,
                    privileges
                }
            });
        } catch (error) {
            console.error('Login external error:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    }
};

module.exports = authController;
