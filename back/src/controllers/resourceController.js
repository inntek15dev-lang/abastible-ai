const { Op } = require('sequelize');
const { Dependencia, TipoContratista, Vinculacion, Administracion, Gerencia, Subgerencia, User, Role, Contratista, VinculacionUsuario } = require('../database/models');
const { getProgramaScope } = require('../utils/programaScopeHelper');

// Helper: get cIds robustly for contratista_admin
const getContratistaAdminIds = (user) => {
    const cIds = [];
    if (Array.isArray(user.contratista_ids) && user.contratista_ids.length > 0) {
        cIds.push(...user.contratista_ids.map(Number));
    }
    if (user.contratista_id && !cIds.includes(Number(user.contratista_id))) {
        cIds.push(Number(user.contratista_id));
    }
    return cIds;
};

// Helper: get scope vinculacion IDs for contratista_user (from VinculacionUsuario)
const getContratistaUserVincIds = async (userId) => {
    const vu = await VinculacionUsuario.findAll({
        where: { user_id: userId, activo: 1 },
        attributes: ['vinculacion_id']
    });
    return vu.map(v => Number(v.vinculacion_id));
};

// Helper: get scope vinculacion IDs for administrador_contrato (from Administracion)
const getAdminContratoVincIds = async (userId) => {
    const adminRecords = await Administracion.findAll({
        where: { administrador_contrato_id: userId, activo: 1 },
        attributes: ['vinculacion_id']
    });
    return adminRecords.map(a => Number(a.vinculacion_id));
};

const resourceController = {
    // GET /api/resources/dependencias
    async dependencias(req, res) {
        try {
            const { role, id } = req.user;
            let where = {};
            let include = [];

            if (role === 'administrador_contrato') {
                include = [{
                    model: Vinculacion,
                    as: 'vinculaciones',
                    required: true,
                    include: [{
                        model: Administracion,
                        as: 'administraciones',
                        where: { administrador_contrato_id: id, activo: 1 },
                        required: true
                    }]
                }];
            } else if (role === 'contratista_user') {
                const vincId = req.user.vinculacion_id;
                if (vincId) {
                    include = [{
                        model: Vinculacion,
                        as: 'vinculaciones',
                        where: { id: vincId },
                        required: true
                    }];
                } else {
                    return res.json({ success: true, data: [] });
                }
            } else if (role === 'contratista_admin') {
                const cIds = getContratistaAdminIds(req.user);
                if (cIds.length === 0) return res.json({ success: true, data: [] });
                include = [{
                    model: Vinculacion,
                    as: 'vinculaciones',
                    where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                    required: true
                }];
            }

            // Cascading filter by servicio
            if (req.query.servicio_id || req.query.servicio) {
                let vincInclude = include.find(inc => inc.as === 'vinculaciones');
                if (!vincInclude) {
                    vincInclude = { model: Vinculacion, as: 'vinculaciones', required: true, include: [] };
                    include.push(vincInclude);
                }
                if (req.query.servicio_id) {
                    vincInclude.where = { ...vincInclude.where, servicio_id: req.query.servicio_id };
                }
                if (req.query.servicio) {
                    vincInclude.include = vincInclude.include || [];
                    let servInclude = vincInclude.include.find(i => i.as === 'servicio');
                    if (!servInclude) {
                        servInclude = { model: TipoContratista, as: 'servicio', required: true, where: {} };
                        vincInclude.include.push(servInclude);
                    }
                    servInclude.where = { ...servInclude.where, nombre: req.query.servicio };
                    servInclude.required = true;
                }
            }

            const includeForIds = include.map(inc => ({
                ...inc,
                attributes: [],
                include: inc.include ? inc.include.map(subInc => ({ ...subInc, attributes: [] })) : []
            }));

            const scopedDeps = await Dependencia.findAll({
                attributes: ['id'],
                where,
                include: includeForIds,
                group: ['Dependencia.id']
            });

            // Filtro global (todos los roles, sin excepción): solo dependencias con al
            // menos una vinculación cuyo servicio tiene Programa asignado.
            const soloHuerfanos = req.query.solo_huerfanos === 'true';
            const scope = await getProgramaScope();
            const eligibleDepIds = new Set(scope.dependenciaIds.map(Number));
            const depIds = scopedDeps
                .map(d => d.id)
                .filter(id => soloHuerfanos ? !eligibleDepIds.has(Number(id)) : eligibleDepIds.has(Number(id)));
            if (depIds.length === 0) return res.json({ success: true, data: [] });

            const data = await Dependencia.findAll({
                attributes: ['id', 'nombre'],
                where: { id: depIds },
                order: [['nombre', 'ASC']]
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching dependencias:', error);
            res.status(500).json({ success: false, message: 'Error al obtener dependencias' });
        }
    },

    // GET /api/resources/tipos-contratista
    async tiposContratista(req, res) {
        try {
            const { role, id } = req.user;
            let where = {};
            let include = [];

            if (role === 'administrador_contrato') {
                include = [{
                    model: Vinculacion,
                    as: 'vinculaciones',
                    required: true,
                    include: [{
                        model: Administracion,
                        as: 'administraciones',
                        where: { administrador_contrato_id: id, activo: 1 },
                        required: true
                    }]
                }];
            } else if (role === 'contratista_user') {
                const vincId = req.user.vinculacion_id;
                if (vincId) {
                    include = [{
                        model: Vinculacion,
                        as: 'vinculaciones',
                        where: { id: vincId },
                        required: true
                    }];
                } else {
                    return res.json({ success: true, data: [] });
                }
            } else if (role === 'contratista_admin') {
                const cIds = getContratistaAdminIds(req.user);
                if (cIds.length === 0) return res.json({ success: true, data: [] });
                include = [{
                    model: Vinculacion,
                    as: 'vinculaciones',
                    where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                    required: true
                }];
            }

            const includeForIds = include.map(inc => ({
                ...inc,
                attributes: [],
                include: inc.include ? inc.include.map(subInc => ({ ...subInc, attributes: [] })) : []
            }));

            const scopedTypes = await TipoContratista.findAll({
                attributes: ['id'],
                where,
                include: includeForIds,
                group: ['TipoContratista.id']
            });

            // Filtro global (todos los roles, sin excepción): solo servicios con Programa
            // asignado (o su inverso, solo_huerfanos=true, para revisión/limpieza).
            const soloHuerfanos = req.query.solo_huerfanos === 'true';
            const scope = await getProgramaScope();
            const eligibleServicioIds = new Set(scope.servicioIds.map(Number));
            const typeIds = scopedTypes
                .map(t => t.id)
                .filter(id => soloHuerfanos ? !eligibleServicioIds.has(Number(id)) : eligibleServicioIds.has(Number(id)));
            if (typeIds.length === 0) return res.json({ success: true, data: [] });

            const data = await TipoContratista.findAll({
                attributes: ['id', 'nombre'],
                where: { id: typeIds },
                order: [['nombre', 'ASC']]
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching tipos contratista:', error);
            res.status(500).json({ success: false, message: 'Error al obtener tipos de contratista' });
        }
    },

    // GET /api/resources/gerencias
    async gerencias(req, res) {
        try {
            const { role, id } = req.user;
            const soloHuerfanos = req.query.solo_huerfanos === 'true';
            const scope = await getProgramaScope();
            const eligibleGerenciaIds = new Set(scope.gerenciaIds.map(Number));
            const passesPrograma = (gId) => soloHuerfanos ? !eligibleGerenciaIds.has(Number(gId)) : eligibleGerenciaIds.has(Number(gId));

            // admin / sin restricción de rol — igual se aplica el filtro global de programa
            if (!role || ['admin', 'oval'].includes(role)) {
                const all = await Gerencia.findAll({
                    attributes: ['id', 'nombre'],
                    where: { activo: 1 },
                    order: [['nombre', 'ASC']]
                });
                const data = all.filter(g => passesPrograma(g.id));
                return res.json({ success: true, data });
            }

            // Obtener vinculacion IDs según rol
            let vincIds = [];
            if (role === 'administrador_contrato') {
                vincIds = await getAdminContratoVincIds(id);
            } else if (role === 'contratista_admin') {
                const cIds = getContratistaAdminIds(req.user);
                if (cIds.length === 0) return res.json({ success: true, data: [] });
                const vincs = await Vinculacion.findAll({
                    where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                    attributes: ['id']
                });
                vincIds = vincs.map(v => v.id);
            } else if (role === 'contratista_user') {
                const vincId = req.user.vinculacion_id;
                vincIds = vincId ? [vincId] : [];
            }

            if (vincIds.length === 0) return res.json({ success: true, data: [] });

            // Obtener gerencias únicas de esas vinculaciones
            const vincs = await Vinculacion.findAll({
                where: { id: { [Op.in]: vincIds } },
                attributes: ['gerencia_id'],
                group: ['gerencia_id']
            });
            const gerenciaIds = vincs.map(v => v.gerencia_id).filter(Boolean).filter(passesPrograma);

            if (gerenciaIds.length === 0) return res.json({ success: true, data: [] });

            const data = await Gerencia.findAll({
                attributes: ['id', 'nombre'],
                where: { id: { [Op.in]: gerenciaIds }, activo: 1 },
                order: [['nombre', 'ASC']]
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching gerencias:', error);
            res.status(500).json({ success: false, message: 'Error al obtener gerencias' });
        }
    },

    // GET /api/resources/subgerencias
    async subgerencias(req, res) {
        try {
            const { role, id } = req.user;
            const { gerencia_id } = req.query;
            const soloHuerfanos = req.query.solo_huerfanos === 'true';
            const scope = await getProgramaScope();
            const eligibleSubgerenciaIds = new Set(scope.subgerenciaIds.map(Number));
            const passesPrograma = (sId) => soloHuerfanos ? !eligibleSubgerenciaIds.has(Number(sId)) : eligibleSubgerenciaIds.has(Number(sId));

            // admin / sin restricción de rol — igual se aplica el filtro global de programa
            if (!role || ['admin', 'oval'].includes(role)) {
                const where = { activo: 1 };
                if (gerencia_id && gerencia_id !== 'todas') where.gerencia_id = gerencia_id;
                const all = await Subgerencia.findAll({
                    attributes: ['id', 'nombre', 'gerencia_id'],
                    where,
                    order: [['nombre', 'ASC']]
                });
                const data = all.filter(s => passesPrograma(s.id));
                return res.json({ success: true, data });
            }

            // Obtener vinculacion IDs según rol
            let vincIds = [];
            if (role === 'administrador_contrato') {
                vincIds = await getAdminContratoVincIds(id);
            } else if (role === 'contratista_admin') {
                const cIds = getContratistaAdminIds(req.user);
                if (cIds.length === 0) return res.json({ success: true, data: [] });
                const vincs = await Vinculacion.findAll({
                    where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                    attributes: ['id']
                });
                vincIds = vincs.map(v => v.id);
            } else if (role === 'contratista_user') {
                const vincId = req.user.vinculacion_id;
                vincIds = vincId ? [vincId] : [];
            }

            if (vincIds.length === 0) return res.json({ success: true, data: [] });

            // Filtrar por gerencia si se pasa
            const vincWhere = { id: { [Op.in]: vincIds } };
            if (gerencia_id && gerencia_id !== 'todas') vincWhere.gerencia_id = gerencia_id;

            const vincs = await Vinculacion.findAll({
                where: vincWhere,
                attributes: ['subgerencia_id'],
                group: ['subgerencia_id']
            });
            const subgerenciaIds = vincs.map(v => v.subgerencia_id).filter(Boolean).filter(passesPrograma);

            if (subgerenciaIds.length === 0) return res.json({ success: true, data: [] });

            const data = await Subgerencia.findAll({
                attributes: ['id', 'nombre', 'gerencia_id'],
                where: { id: { [Op.in]: subgerenciaIds }, activo: 1 },
                order: [['nombre', 'ASC']]
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching subgerencias:', error);
            res.status(500).json({ success: false, message: 'Error al obtener subgerencias' });
        }
    },

    // GET /api/resources/adc
    async administradoresContrato(req, res) {
        try {
            const { role, id } = req.user;

            // admin / oval: devuelve todos
            if (!role || ['admin', 'oval'].includes(role)) {
                const data = await User.findAll({
                    attributes: [['usu_id', 'id'], 'name', 'email'],
                    where: { role: 'administrador_contrato', activo: true },
                    order: [['name', 'ASC']]
                });
                return res.json({ success: true, data });
            }

            // administrador_contrato: solo sí mismo
            if (role === 'administrador_contrato') {
                const { Op } = require('sequelize');
                const self = await User.findOne({
                    where: {
                        [Op.or]: [
                            { usu_id: id },
                            { id: id }
                        ]
                    },
                    attributes: [['usu_id', 'id'], 'name', 'email']
                });
                return res.json({ success: true, data: self ? [self] : [] });
            }

            // contratista_admin: ADCs que tienen administraciones en sus vinculaciones
            if (role === 'contratista_admin') {
                const cIds = getContratistaAdminIds(req.user);
                if (cIds.length === 0) return res.json({ success: true, data: [] });

                const vincs = await Vinculacion.findAll({
                    where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                    attributes: ['id']
                });
                const vincIds = vincs.map(v => v.id);
                if (vincIds.length === 0) return res.json({ success: true, data: [] });

                const admins = await Administracion.findAll({
                    where: { vinculacion_id: { [Op.in]: vincIds }, activo: 1 },
                    attributes: ['administrador_contrato_id'],
                    group: ['administrador_contrato_id']
                });
                const adcIds = admins.map(a => a.administrador_contrato_id);
                if (adcIds.length === 0) return res.json({ success: true, data: [] });

                const data = await User.findAll({
                    attributes: [['usu_id', 'id'], 'name', 'email'],
                    where: {
                        [Op.or]: [
                            { usu_id: { [Op.in]: adcIds } },
                            { id: { [Op.in]: adcIds } }
                        ],
                        activo: true
                    },
                    order: [['name', 'ASC']]
                });
                return res.json({ success: true, data });
            }

            // contratista_user: no necesita ver ADCs
            return res.json({ success: true, data: [] });
        } catch (error) {
            console.error('Error fetching ADCs:', error);
            res.status(500).json({ success: false, message: 'Error al obtener administradores de contrato' });
        }
    },

    // GET /api/resources/adc-scope
    async adcScope(req, res) {
        try {
            const { role, id } = req.user;
            if (role !== 'administrador_contrato') {
                return res.json({ success: true, data: { empresas: [], dependencias: [] } });
            }

            const administraciones = await Administracion.findAll({
                where: { administrador_contrato_id: id, activo: 1 },
                include: [{
                    model: Vinculacion,
                    as: 'vinculacion',
                    required: true,
                    include: [
                        { model: Contratista, as: 'contratista', required: true },
                        { model: Dependencia, as: 'dependencia', required: true }
                    ]
                }]
            });

            const empresasMap = new Map();
            const dependenciasMap = new Map();

            administraciones.forEach(adm => {
                const v = adm.vinculacion;
                if (v && v.contratista) {
                    empresasMap.set(v.contratista.id, {
                        id: v.contratista.id,
                        nombre: v.contratista.nombre,
                        rut: v.contratista.rut
                    });
                }
                if (v && v.dependencia) {
                    dependenciasMap.set(v.dependencia.id, {
                        id: v.dependencia.id,
                        nombre: v.dependencia.nombre
                    });
                }
            });

            res.json({
                success: true,
                data: {
                    empresas: Array.from(empresasMap.values()),
                    dependencias: Array.from(dependenciasMap.values())
                }
            });
        } catch (error) {
            console.error('Error fetching ADC scope:', error);
            res.status(500).json({ success: false, message: 'Error al obtener alcance del ADC' });
        }
    },

    // GET /api/resources/roles
    async roles(req, res) {
        try {
            const roles = await Role.findAll({
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            });
            res.json({ success: true, data: roles });
        } catch (error) {
            console.error('Error fetching roles:', error);
            res.status(500).json({ success: false, message: 'Error al obtener roles' });
        }
    }
};

module.exports = resourceController;

