// IEEE Trace: REQ-007 | middleware/auth.js
const jwt = require('jsonwebtoken');
const { User, Role, Privilegio } = require('../database/models');

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

        req.user = {
            ...user.toJSON(),
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
