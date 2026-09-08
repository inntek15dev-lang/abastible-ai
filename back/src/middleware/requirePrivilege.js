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

        // STRICT SECURITY RULE: contratista_user must never access Usuarios or Admin_Usuarios modules under any circumstances.
        if (role === 'contratista_user' && ['Usuarios', 'Admin_Usuarios'].includes(module)) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado: el rol contratista_user no tiene acceso a este módulo'
            });
        }

        if (role === 'admin' || role === 'oval') {
            return next();
        }

        // Hardcode: Contratista Admin has access to Usuarios
        if (role === 'contratista_admin' && module === 'Usuarios') {
            return next();
        }

        // Hardcode: Administrador de Contratos has read-only access to Usuarios (needed to list contractor users they manage)
        if (role === 'administrador_contrato' && module === 'Usuarios' && action === 'read') {
            return next();
        }

        // Hardcode: Operational roles (contratista_user, contratista_admin, administrador_contrato) have read/write access to Registros, Evidencias, and Compromisos
        // (Data isolation is strictly enforced per contract/tenant inside the respective controllers)
        if (['contratista_user', 'contratista_admin', 'administrador_contrato'].includes(role)) {
            if (['Registros', 'Evidencias', 'Compromisos'].includes(module) && action !== 'excec') {
                return next();
            }
        }

        // Hardcode: Administrador de Contratos has access to Auditoria, Reaperturas, and Hallazgos to audit records, manage findings, and review subsanaciones
        if (role === 'administrador_contrato' && ['Auditoria', 'Reaperturas', 'Hallazgos'].includes(module)) {
            return next();
        }

        let hasPrivilege = false;

        if (Array.isArray(privileges)) {
            hasPrivilege = privileges.some(p =>
                (p.module === '*' || p.ref_modulo === '*' || p.module === module || p.ref_modulo === module) && Boolean(p[action])
            );
        } else if (privileges && typeof privileges === 'object') {
            const wildcardOk = privileges['*'] && Boolean(privileges['*'][action]);
            const moduleOk = privileges[module] && Boolean(privileges[module][action]);
            hasPrivilege = Boolean(wildcardOk || moduleOk);
        }

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
