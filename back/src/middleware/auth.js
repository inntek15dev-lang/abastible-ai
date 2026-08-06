// IEEE Trace: REQ-007 | middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio, ContratistaUsuario, VinculacionUsuario, Vinculacion } = require('../database/models');

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

        if (!user || !user.activo) {
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

        // Load privileges based on role
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

        // Retrieve multiple assigned contractors (for contratista_admin many-to-many relationship)
        const assigned = await ContratistaUsuario.findAll({
            where: { user_id: user.usu_id || user.id },
            attributes: ['contratista_id']
        });
        const contratistaIds = [...new Set(assigned.map(c => Number(c.contratista_id)))];
        // Ensure legacy user.contratista_id is included as fallback
        if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
            contratistaIds.push(Number(user.contratista_id));
        }

        // Un contratista_user NO tiene identidad propia de empresa/servicio/dependencia:
        // esas columnas del usuario están siempre en NULL por diseño (usuarioController
        // las anula explícitamente). Su ÚNICO scope real es el contrato (Vinculación) al
        // que fue asignado vía VinculacionUsuario — el numero_contrato de OVAL es el filtro
        // fijo que debe gobernar todo lo que puede ver. Se deriva aquí, una sola vez, para
        // que ningún controller vuelva a depender de las columnas NULL del usuario.
        let vinculacion_id = null;
        let vinculacionScope = {
            contratista_id: null,
            tipo_contratista_id: null,
            dependencia_id: null,
            subgerencia_id: null,
            gerencia_id: null,
            numero_contrato: null
        };
        if (user.role === 'contratista_user') {
            const vu = await VinculacionUsuario.findOne({
                where: { user_id: user.usu_id || user.id, activo: 1 },
                attributes: ['vinculacion_id'],
                include: [{ model: Vinculacion, as: 'vinculacion', attributes: ['id', 'contratista_id', 'servicio_id', 'dependencia_id', 'subgerencia_id', 'gerencia_id', 'numero_contrato'], where: { activo: 1 }, required: false }]
            });
            vinculacion_id = vu ? Number(vu.vinculacion_id) : null;
            if (vu && vu.vinculacion) {
                vinculacionScope = {
                    contratista_id: vu.vinculacion.contratista_id,
                    tipo_contratista_id: vu.vinculacion.servicio_id,
                    dependencia_id: vu.vinculacion.dependencia_id,
                    subgerencia_id: vu.vinculacion.subgerencia_id,
                    gerencia_id: vu.vinculacion.gerencia_id,
                    numero_contrato: vu.vinculacion.numero_contrato
                };
            } else {
                // Vinculación asignada pero inactiva/inexistente: fail-closed, sin scope.
                vinculacion_id = null;
            }
        }

        const userJson = user.toJSON();
        delete userJson.session_token;
        req.user = {
            ...userJson,
            id: user.usu_id || user.id, // Map id to usu_id with fallback to legacy id
            contratista_ids: contratistaIds,
            vinculacion_id,
            // Para contratista_user, estos SIEMPRE reemplazan las columnas NULL crudas de
            // userJson con el scope derivado del contrato. Para el resto de los roles se
            // preservan los valores propios del usuario (spread de userJson ya los puso).
            ...(user.role === 'contratista_user' ? vinculacionScope : {}),
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
