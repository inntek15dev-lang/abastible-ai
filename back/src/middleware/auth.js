// IEEE Trace: REQ-007 | middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio, ContratistaUsuario, VinculacionUsuario } = require('../database/models');

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

        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user || !user.activo) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
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
            where: { user_id: user.id },
            attributes: ['contratista_id']
        });
        const contratistaIds = [...new Set(assigned.map(c => Number(c.contratista_id)))];
        // Ensure legacy user.contratista_id is included as fallback
        if (user.contratista_id && !contratistaIds.includes(Number(user.contratista_id))) {
            contratistaIds.push(Number(user.contratista_id));
        }

        // Load vinculacion_id for contratista_user (single vinculacion via VinculacionUsuario)
        let vinculacion_id = null;
        if (user.role === 'contratista_user') {
            const vu = await VinculacionUsuario.findOne({
                where: { user_id: user.id, activo: 1 },
                attributes: ['vinculacion_id']
            });
            vinculacion_id = vu ? Number(vu.vinculacion_id) : null;
        }

        req.user = {
            ...user.toJSON(),
            contratista_ids: contratistaIds,
            vinculacion_id,
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
