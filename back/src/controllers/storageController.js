// IEEE Trace: REQ-005 | HU-02 | controllers/storageController.js
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { Evidencia, RegistroActividad, Compromiso, Documento, Vinculacion } = require('../database/models');
const { isRegistroInScope, getAllowedVinculacionIds, getContratistaAdminIds } = require('../utils/scopeHelper');

const STORAGE_ROOT = path.resolve(__dirname, '../../../storage');

const GLOBAL_ADMIN_ROLES = ['admin', 'oval', 'administrador', 'super_admin', 'admin_dios'];

/**
 * Authorize access to a relative path inside /storage based on user role and tenant scope.
 */
async function isStoragePathAuthorized(user, normalizedRelPath) {
    const roleStr = String(user?.role || '').toLowerCase();
    if (GLOBAL_ADMIN_ROLES.includes(roleStr)) {
        return true;
    }

    // 1. Global templates (programas / templates_evidencia) are accessible to any authenticated user
    if (/^(programas|templates_evidencia)\//i.test(normalizedRelPath)) {
        return true;
    }

    // 2. Registro-scoped files: storage/registros/:registroId/...
    const regMatch = normalizedRelPath.match(/^registros\/(\d+)\//i);
    if (regMatch) {
        const registroId = Number(regMatch[1]);
        return await isRegistroInScope(user, registroId);
    }

    // 3. Fallback DB lookup for legacy paths (Evidencia, Compromiso, Documento)
    const dbPathCandidates = [normalizedRelPath, `storage/${normalizedRelPath}`];

    const evidencia = await Evidencia.findOne({
        where: { ruta: { [Op.in]: dbPathCandidates } },
        include: [{ model: RegistroActividad, as: 'registroActividad', attributes: ['registro_id'] }]
    });
    if (evidencia?.registroActividad?.registro_id) {
        return await isRegistroInScope(user, evidencia.registroActividad.registro_id);
    }

    const compromiso = await Compromiso.findOne({
        where: {
            [Op.or]: [
                { archivo_url: { [Op.in]: dbPathCandidates } },
                { archivo_cierre_url: { [Op.in]: dbPathCandidates } }
            ]
        },
        attributes: ['id', 'registro_id']
    });
    if (compromiso?.registro_id) {
        return await isRegistroInScope(user, compromiso.registro_id);
    }

    const documento = await Documento.findOne({
        where: { url: { [Op.in]: dbPathCandidates } },
        attributes: ['id', 'contratista_id']
    });
    if (documento?.contratista_id) {
        const cIds = getContratistaAdminIds(user);
        if (cIds.includes(Number(documento.contratista_id))) return true;

        const allowedVincIds = await getAllowedVinculacionIds(user);
        if (Array.isArray(allowedVincIds) && allowedVincIds.length > 0) {
            const matchingVinc = await Vinculacion.findOne({
                where: {
                    id: { [Op.in]: allowedVincIds },
                    contratista_id: documento.contratista_id
                },
                attributes: ['id']
            });
            if (matchingVinc) return true;
        }
    }

    // Fail-closed by default
    return false;
}

const storageController = {
    async serve(req, res) {
        try {
            const rawParam = req.params[0] || '';

            let decodedPath;
            try {
                decodedPath = decodeURIComponent(rawParam);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Ruta de archivo malformada'
                });
            }

            if (!decodedPath || decodedPath.includes('\0')) {
                return res.status(400).json({
                    success: false,
                    message: 'Ruta de archivo inválida'
                });
            }

            // Normalize separators and strip leading slashes
            const normalizedRelPath = decodedPath.replace(/\\/g, '/').replace(/^\/+/, '');
            if (!normalizedRelPath) {
                return res.status(400).json({
                    success: false,
                    message: 'Ruta de archivo requerida'
                });
            }

            // Explicit path traversal segment guard
            const segments = normalizedRelPath.split('/');
            if (segments.includes('..') || segments.includes('.')) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado: Path Traversal detectado'
                });
            }

            const resolvedPath = path.resolve(STORAGE_ROOT, normalizedRelPath);
            const storageRootWithSep = STORAGE_ROOT.endsWith(path.sep) ? STORAGE_ROOT : STORAGE_ROOT + path.sep;

            if (!resolvedPath.startsWith(storageRootWithSep)) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado: ruta fuera del directorio de almacenamiento'
                });
            }

            if (!fs.existsSync(resolvedPath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Archivo no encontrado'
                });
            }

            const stat = fs.statSync(resolvedPath);
            if (!stat.isFile()) {
                return res.status(404).json({
                    success: false,
                    message: 'Recurso no es un archivo válido'
                });
            }

            // Verify realpath after symlink resolution stays within STORAGE_ROOT
            const realStorageRoot = fs.realpathSync(STORAGE_ROOT);
            const realResolvedPath = fs.realpathSync(resolvedPath);
            const realRootWithSep = realStorageRoot.endsWith(path.sep) ? realStorageRoot : realStorageRoot + path.sep;
            if (!realResolvedPath.startsWith(realRootWithSep)) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado: enlace simbólico fuera del directorio autorizado'
                });
            }

            // Tenant / Scope authorization
            const authorized = await isStoragePathAuthorized(req.user, normalizedRelPath);
            if (!authorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para acceder a este archivo'
                });
            }

            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'private, no-store');
            return res.sendFile(realResolvedPath);
        } catch (error) {
            console.error('Storage serve error:', error);
            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al obtener archivo solicitado'
                });
            }
        }
    }
};

module.exports = storageController;

