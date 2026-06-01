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
        
        // REGLA CRÍTICA PARKO: El módulo OVAL es EXCLUSIVO para el rol 'oval'
        if (module === 'OVAL') {
            if (role === 'oval') return next();
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado: El módulo OVAL es exclusivo para personal OVAL'
            });
        }

        if (role === 'admin' || role === 'oval') {
            return next();
        }

        // Hardcode: Contratista Admin has access to Usuarios
        if (role === 'contratista_admin' && module === 'Usuarios') {
            return next();
        }

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
