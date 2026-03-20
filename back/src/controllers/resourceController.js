const { Dependencia, TipoContratista, Vinculacion, Administracion, Gerencia, Subgerencia, User, Role } = require('../database/models');

const resourceController = {
    // GET /api/resources/dependencias
    async dependencias(req, res) {
        try {
            const { role, id, contratista_id } = req.user;
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
                const { dependencia_id } = req.user;
                where.id = dependencia_id;
            } else if (role === 'contratista_admin') {
                const cId = contratista_id || req.user.contratista_id;

                include = [{
                    model: Vinculacion,
                    as: 'vinculaciones',
                    where: { contratista_id: cId, activo: 1 },
                    required: true
                }];
            }

            // Cascading filter for admin_sistema or others
            // Cascading filter for admin_sistema or others
            if (req.query.servicio_id || req.query.servicio) {
                let vincInclude = include.find(inc => inc.as === 'vinculaciones');
                if (!vincInclude) {
                    vincInclude = {
                        model: Vinculacion,
                        as: 'vinculaciones',
                        required: true,
                        include: []
                    };
                    include.push(vincInclude);
                }

                // If filtering by ID, applied to Vinculacion
                if (req.query.servicio_id) {
                    vincInclude.where = { ...vincInclude.where, servicio_id: req.query.servicio_id };
                }

                // If filtering by Name, applied to TipoContratista association
                if (req.query.servicio) {
                    vincInclude.include = vincInclude.include || [];
                    let servInclude = vincInclude.include.find(i => i.as === 'servicio');

                    if (!servInclude) {
                        servInclude = {
                            model: TipoContratista,
                            as: 'servicio',
                            required: true,
                            where: {}
                        };
                        vincInclude.include.push(servInclude);
                    }

                    // Merge where clause safely
                    servInclude.where = { ...servInclude.where, nombre: req.query.servicio };
                    servInclude.required = true; // Ensure inner join
                }
            }

            // Ensure includes do not select attributes to avoid GROUP BY errors
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

            const depIds = scopedDeps.map(d => d.id);

            if (depIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

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
            const { role, id, contratista_id } = req.user;
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
                const { tipo_contratista_id } = req.user;
                where.id = tipo_contratista_id;
            } else if (role === 'contratista_admin') {
                const cId = contratista_id || req.user.contratista_id;

                include = [{
                    model: Vinculacion,
                    as: 'vinculaciones',
                    where: { contratista_id: cId, activo: 1 },
                    required: true
                }];
            }

            // Ensure includes do not select attributes to avoid GROUP BY errors
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

            const typeIds = scopedTypes.map(t => t.id);

            if (typeIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

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
            // Nota: Para este MVP y filtros, devolveremos todas las gerencias activas.
            // Si el user scope limita vistas, las dependencias filtradas actuarán en cascada.
            const data = await Gerencia.findAll({
                attributes: ['id', 'nombre'],
                where: { activo: 1 },
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
            const { gerencia_id } = req.query;
            let where = { activo: 1 };
            
            // Filtro cascada si se envía gerencia_id
            if (gerencia_id && gerencia_id !== 'todas') {
                where.gerencia_id = gerencia_id;
            }

            const data = await Subgerencia.findAll({
                attributes: ['id', 'nombre', 'gerencia_id'],
                where,
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
            // Usuarios con rol de administrador_contrato que están activos
            const data = await User.findAll({
                attributes: ['id', 'name', 'email'],
                where: { role: 'administrador_contrato', activo: true },
                order: [['name', 'ASC']]
            });
            res.json({ success: true, data });
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
