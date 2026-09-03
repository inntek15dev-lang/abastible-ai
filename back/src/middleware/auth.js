// IEEE Trace: REQ-007 | middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio, ContratistaUsuario, VinculacionUsuario, Vinculacion, Contratista, Administracion } = require('../database/models');

const authMiddleware = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acceso no proporcionado'
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { Op } = require('sequelize');
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { usu_id: decoded.id },
                    { id: decoded.id }
                ]
            },
            attributes: { exclude: ['password'] }
        });

        if (!user || user.activo === 0 || user.activo === false) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        // Sesión única: si el sid del token no coincide con el session_token vigente del
        // usuario, un login posterior (local o SSO, desde otro dispositivo/pestaña) ya lo
        // reemplazó. El token sigue siendo válido en firma/expiración, pero ya no es la
        // sesión activa — se rechaza igual que un token expirado.
        if (!decoded.sid || decoded.sid !== user.session_token) {
            return res.status(401).json({
                success: false,
                message: 'Sesión finalizada: se inició sesión desde otro dispositivo o navegador.'
            });
        }

        // Fetch user permissions
        const userPrivileges = await Privilegio.findAll({
            where: { role_id: user.role_id || user.role }
        });

        // Resolve role name if role_id is numeric
        let roleName = user.role;
        if (!isNaN(user.role)) {
            const roleRecord = await Role.findByPk(user.role);
            if (roleRecord) roleName = roleRecord.name;
        }

        const privileges = {};
        userPrivileges.forEach(priv => {
            privileges[priv.ref_modulo] = {
                read: Boolean(priv.read),
                write: Boolean(priv.write),
                excec: Boolean(priv.excec)
            };
        });

        // Contratista IDs for contratista_admin / contratista_user
        let contratistaIds = [];
        if (roleName === 'contratista_admin') {
            const cus = await ContratistaUsuario.findAll({
                where: { user_id: user.usu_id || user.id },
                attributes: ['contratista_id']
            });
            contratistaIds = cus.map(cu => Number(cu.contratista_id));
            if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
                contratistaIds.push(Number(user.contratista_id));
            }
        } else if (user.contratista_id) {
            contratistaIds.push(Number(user.contratista_id));
        }

        // Un contratista_user NO tiene identidad propia de empresa/servicio/dependencia:
        // esas columnas del usuario están siempre en NULL por diseño (usuarioController
        // las anula explícitamente). Su scope real son los contratos (Vinculaciones) a los
        // que fue asignado vía VinculacionUsuario. Se derivan aquí, una sola vez, para
        // que ningún controller vuelva a depender de las columnas NULL del usuario.
        let vinculacion_ids = [];
        let vinculacion_id = null; // Compat: primer vinculacion_id del array
        let vinculacionScope = {
            contratista_id: null,
            tipo_contratista_id: null,
            dependencia_id: null,
            subgerencia_id: null,
            gerencia_id: null,
            numero_contrato: null
        };

        if (roleName === 'administrador_contrato') {
            const admins = await Administracion.findAll({
                where: { administrador_contrato_id: user.usu_id || user.id, activo: 1 },
                attributes: ['vinculacion_id']
            });
            vinculacion_ids = admins.map(a => Number(a.vinculacion_id));
            vinculacion_id = vinculacion_ids.length > 0 ? vinculacion_ids[0] : null;
        } else if (roleName === 'contratista_user') {
            const vus = await VinculacionUsuario.findAll({
                where: { user_id: user.usu_id || user.id, activo: 1 },
                attributes: ['vinculacion_id'],
                include: [{
                    model: Vinculacion,
                    as: 'vinculacion',
                    attributes: ['id', 'contratista_id', 'servicio_id', 'dependencia_id', 'subgerencia_id', 'gerencia_id', 'numero_contrato'],
                    include: [{ model: Contratista, as: 'contratista', attributes: ['id', 'nombre', 'rut'] }],
                    where: { activo: 1 },
                    required: false
                }]
            });
            // Filtrar solo las que tienen vinculación activa
            const activeVus = vus.filter(vu => vu.vinculacion);
            vinculacion_ids = activeVus.map(vu => Number(vu.vinculacion_id));
            vinculacion_id = vinculacion_ids.length > 0 ? vinculacion_ids[0] : null;

            const companyNames = new Set();
            activeVus.forEach(vu => {
                if (vu.vinculacion?.contratista?.nombre) {
                    companyNames.add(vu.vinculacion.contratista.nombre);
                }
                if (vu.vinculacion?.contratista_id) {
                    contratistaIds.push(Number(vu.vinculacion.contratista_id));
                }
            });
            contratistaIds = [...new Set(contratistaIds)];

            if (activeVus.length > 0) {
                const first = activeVus[0].vinculacion;
                vinculacionScope = {
                    contratista_id: first.contratista_id,
                    tipo_contratista_id: first.servicio_id,
                    dependencia_id: first.dependencia_id,
                    subgerencia_id: first.subgerencia_id,
                    gerencia_id: first.gerencia_id,
                    numero_contrato: first.numero_contrato,
                    eecc_nombre: companyNames.size > 0 ? Array.from(companyNames).join(', ') : (first.contratista?.nombre || null)
                };
            }
        }

        const userJson = user.toJSON();
        delete userJson.session_token;
        req.user = {
            ...userJson,
            id: user.usu_id || user.id, // Map id to usu_id with fallback to legacy id
            role: roleName, // Mapeo explícito al nombre del rol resuelto (evita que role_id numérico pise el nombre)
            contratista_ids: contratistaIds,
            vinculacion_id,
            vinculacion_ids,
            // Para contratista_user, estos SIEMPRE reemplazan las columnas NULL crudas de
            // userJson con el scope derivado del contrato. Para el resto de los roles se
            // preservan los valores propios del usuario (spread de userJson ya los puso).
            ...(roleName === 'contratista_user' ? vinculacionScope : {}),
            privileges
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error de autenticación'
        });
    }
};

module.exports = authMiddleware;
