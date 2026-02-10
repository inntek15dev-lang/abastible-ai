// IEEE Trace: REQ-007 | middleware/requirePrivilege.js

/**
 * Middleware factory for privilege-based access control
 * @param {string} module - Module reference (e.g., 'Programas', 'Registros', '*')
 * @param {string} action - Required action: 'read', 'write', or 'excec'
 */
const requirePrivilege = (module, action = 'read') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const { privileges, role } = req.user;

        // Admin with wildcard has all privileges
        const hasWildcard = privileges.some(p => p.module === '*' && p[action]);
        if (hasWildcard) {
            return next();
        }

        // Check specific module privilege
        const hasPrivilege = privileges.some(p =>
            p.module === module && p[action]
        );

        if (hasPrivilege) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Acceso denegado: se requiere permiso ${action} para módulo ${module}`
        });
    };
};

module.exports = requirePrivilege;
