// IEEE Trace: REQ-007 | US-006 | authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio, Contratista, ContratistaUsuario } = require('../database/models');

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

            // Retrieve multiple assigned contractors (for contratista_admin many-to-many relationship)
            const assigned = await ContratistaUsuario.findAll({
                where: { user_id: user.id },
                attributes: ['contratista_id']
            });
            const contratistaIds = [...new Set(assigned.map(c => Number(c.contratista_id)))];
            if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
                contratistaIds.push(Number(user.contratista_id));
            }

            const userData = user.toJSON();
            delete userData.password;

            res.json({
                success: true,
                token,
                user: {
                    ...userData,
                    contratista_ids: contratistaIds,
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
            const sharedApiKey = process.env.EXTERNAL_API_KEY || ''; // Needs to be in .env

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

            // Find or create user
            let user = await User.findOne({ where: { email: userData.email } });

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

                const contratistas = await Contratista.findAll();

                for (const rc of resolvedContractors) {
                    const cleanExtRut = cleanRutString(rc.rut);
                    let contratista = contratistas.find(c => cleanRutString(c.rut) === cleanExtRut);

                    if (!contratista) {
                        contratista = await Contratista.create({
                            rut: rc.rut,
                            nombre: rc.nombre || `Contratista ${rc.rut}`,
                            activo: 1
                        });
                    } else if (rc.nombre && contratista.nombre !== rc.nombre && rc.nombre !== rc.rut) {
                        await contratista.update({ nombre: rc.nombre });
                    }

                    resolvedContractorIds.push(contratista.id);
                    if (!firstContratistaId) {
                        firstContratistaId = contratista.id;
                        firstEeccNombre = contratista.nombre;
                    }
                }
            }

            if (!user) {
                // Register user locally
                user = await User.create({
                    email: userData.email,
                    name: userData.nombre,
                    usuario: userData.usuario,
                    usu_id_pizza: userData.usu_id,
                    password: bcrypt.hashSync(require('crypto').randomBytes(16).toString('hex'), 10),
                    role: mappedRole,
                    contratista_id: firstContratistaId,
                    eecc_nombre: firstEeccNombre,
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
                if (user.role !== mappedRole) {
                    user.role = mappedRole;
                    updated = true;
                }
                if (firstContratistaId && user.contratista_id !== firstContratistaId) {
                    user.contratista_id = firstContratistaId;
                    updated = true;
                }
                if (firstEeccNombre && user.eecc_nombre !== firstEeccNombre) {
                    user.eecc_nombre = firstEeccNombre;
                    updated = true;
                }
                if (updated) {
                    await user.save();
                }
            }

            // Sincronizar tabla de muchos a muchos contratista_usuarios
            if (mappedRole === 'contratista_admin' && resolvedContractorIds.length > 0) {
                await ContratistaUsuario.destroy({ where: { user_id: user.id } });
                const assocData = resolvedContractorIds.map(cId => ({
                    user_id: user.id,
                    contratista_id: cId
                }));
                await ContratistaUsuario.bulkCreate(assocData);
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

            // Retrieve multiple assigned contractors (for contratista_admin many-to-many relationship)
            const assigned = await ContratistaUsuario.findAll({
                where: { user_id: user.id },
                attributes: ['contratista_id']
            });
            const contratistaIds = [...new Set(assigned.map(c => Number(c.contratista_id)))];
            if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
                contratistaIds.push(Number(user.contratista_id));
            }

            const userJson = user.toJSON();
            delete userJson.password;

            res.json({
                success: true,
                token: jwtToken,
                user: {
                    ...userJson,
                    contratista_ids: contratistaIds,
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
