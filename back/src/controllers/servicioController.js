const { TipoContratista, Programa, Gerencia, Subgerencia, Vinculacion, Administracion, sequelize } = require('../database/models');
const { Op } = require('sequelize');

const servicioController = {
    // GET /api/servicios/hierarchy (Tree structure)
    async hierarchy(req, res) {
        try {
            const gerencias = await Gerencia.findAll({
                where: { activo: 1 },
                include: [{
                    model: Subgerencia,
                    as: 'subgerencias',
                    where: { activo: 1 },
                    required: false,
                    include: [{
                        model: TipoContratista,
                        as: 'servicios',
                        where: { activo: 1 },
                        required: false,
                        include: [{ model: Programa, as: 'programa', attributes: ['id', 'nombre'] }]
                    }]
                }],
                order: [
                    ['nombre', 'ASC'],
                    [{ model: Subgerencia, as: 'subgerencias' }, 'nombre', 'ASC'],
                    [{ model: Subgerencia, as: 'subgerencias' }, { model: TipoContratista, as: 'servicios' }, 'nombre', 'ASC']
                ]
            });
            res.json({ success: true, data: gerencias });
        } catch (error) {
            console.error('Hierarchy error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener jerarquía' });
        }
    },

    // GET /api/servicios
    async index(req, res) {
        try {
            const { activo, programa_id, subgerencia_id } = req.query;
            let where = {};
            if (activo !== undefined) where.activo = activo;
            if (programa_id) where.programa_id = programa_id;
            if (subgerencia_id) where.subgerencia_id = subgerencia_id;

            // Scoping por rol: sin esto, cualquier usuario autenticado (incluido
            // contratista_user) veía el catálogo completo de servicios de toda la
            // organización, no solo los de sus propias vinculaciones. admin/oval ven todo
            // (uso legítimo: gestión de configuración global).
            const { role, id: userId } = req.user;
            if (!['admin', 'oval'].includes(role)) {
                const vincWhere = { activo: 1 };
                if (role === 'administrador_contrato') {
                    const adminVincs = await Administracion.findAll({
                        where: { administrador_contrato_id: userId, activo: 1 },
                        attributes: ['vinculacion_id']
                    });
                    vincWhere.id = { [Op.in]: adminVincs.map(a => a.vinculacion_id) };
                } else if (role === 'contratista_admin') {
                    const cIds = [];
                    if (Array.isArray(req.user.contratista_ids) && req.user.contratista_ids.length > 0) {
                        cIds.push(...req.user.contratista_ids.map(Number));
                    }
                    if (req.user.contratista_id && !cIds.includes(Number(req.user.contratista_id))) {
                        cIds.push(Number(req.user.contratista_id));
                    }
                    vincWhere.contratista_id = { [Op.in]: cIds.length > 0 ? cIds : [-1] };
                } else if (role === 'contratista_user') {
                    vincWhere.id = req.user.vinculacion_id || -1;
                } else {
                    vincWhere.id = -1;
                }

                const scopedVincs = await Vinculacion.findAll({ where: vincWhere, attributes: ['servicio_id'] });
                const scopedServicioIds = [...new Set(scopedVincs.map(v => v.servicio_id))];
                if (scopedServicioIds.length === 0) return res.json({ success: true, data: [] });
                where.id = { [Op.in]: scopedServicioIds };
            }

            const servicios = await TipoContratista.findAll({
                where,
                include: [
                    { model: Programa, as: 'programa', attributes: ['id', 'nombre'] },
                    { 
                        model: Subgerencia, 
                        as: 'subgerencia', 
                        include: [{ model: Gerencia, as: 'gerencia' }]
                    }
                ],
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(SELECT COUNT(DISTINCT v.contratista_id) FROM vinculaciones v WHERE v.servicio_id = TipoContratista.id AND v.activo = 1)`),
                            'contratistas_count'
                        ],
                        [
                            sequelize.literal(`(SELECT COUNT(*) FROM vinculaciones v WHERE v.servicio_id = TipoContratista.id AND v.activo = 1)`),
                            'vinculaciones_count'
                        ]
                    ]
                },
                order: [['nombre', 'ASC']]
            });
            res.json({ success: true, data: servicios });
        } catch (error) {
            console.error('Servicios index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener servicios' });
        }
    },

    // GET /api/servicios/:id
    async show(req, res) {
        try {
            const servicio = await TipoContratista.findByPk(req.params.id, {
                include: [
                    { model: Programa, as: 'programa', attributes: ['id', 'nombre'] },
                    { model: Subgerencia, as: 'subgerencia' }
                ]
            });
            if (!servicio) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }
            res.json({ success: true, data: servicio });
        } catch (error) {
            console.error('Servicio show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener servicio' });
        }
    },

    // POST /api/servicios
    async store(req, res) {
        try {
            const { nombre, descripcion, programa_id, subgerencia_id, activo } = req.body;
            if (!nombre || !programa_id) {
                return res.status(400).json({ success: false, message: 'Nombre y Programa son obligatorios' });
            }

            const servicio = await TipoContratista.create({
                nombre,
                descripcion,
                programa_id,
                subgerencia_id,
                activo: activo !== undefined ? activo : 1
            });

            res.status(201).json({ success: true, data: servicio });
        } catch (error) {
            console.error('Servicio store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear servicio' });
        }
    },

    // PUT /api/servicios/:id
    async update(req, res) {
        try {
            const servicio = await TipoContratista.findByPk(req.params.id);
            if (!servicio) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }

            const { nombre, descripcion, programa_id, subgerencia_id, activo } = req.body;
            await servicio.update({
                nombre: nombre || servicio.nombre,
                descripcion: descripcion !== undefined ? descripcion : servicio.descripcion,
                programa_id: programa_id || servicio.programa_id,
                subgerencia_id: subgerencia_id !== undefined ? subgerencia_id : servicio.subgerencia_id,
                activo: activo !== undefined ? activo : servicio.activo
            });

            res.json({ success: true, data: servicio });
        } catch (error) {
            console.error('Servicio update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar servicio' });
        }
    },

    // DELETE /api/servicios/:id
    async destroy(req, res) {
        try {
            const servicio = await TipoContratista.findByPk(req.params.id);
            if (!servicio) {
                return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
            }

            await servicio.update({ activo: 0 });
            res.json({ success: true, message: 'Servicio desactivado' });
        } catch (error) {
            console.error('Servicio destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar servicio' });
        }
    },

    // ============= GERENCIAS CRUD =============
    async storeGerencia(req, res) {
        try {
            const { nombre, contratista_id } = req.body;
            const gerencia = await Gerencia.create({ nombre, contratista_id, activo: 1 });
            res.status(201).json({ success: true, data: gerencia });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al crear gerencia' });
        }
    },

    async updateGerencia(req, res) {
        try {
            const gerencia = await Gerencia.findByPk(req.params.id);
            if (!gerencia) return res.status(404).json({ success: false, message: 'Gerencia no encontrada' });
            await gerencia.update(req.body);
            res.json({ success: true, data: gerencia });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al actualizar gerencia' });
        }
    },

    async destroyGerencia(req, res) {
        try {
            const gerencia = await Gerencia.findByPk(req.params.id);
            if (!gerencia) return res.status(404).json({ success: false, message: 'Gerencia no encontrada' });
            await gerencia.update({ activo: 0 });
            res.json({ success: true, message: 'Gerencia desactivada' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al desactivar gerencia' });
        }
    },

    // ============= SUBGERENCIAS CRUD =============
    async storeSubgerencia(req, res) {
        try {
            const { nombre, gerencia_id } = req.body;
            const subgerencia = await Subgerencia.create({ nombre, gerencia_id, activo: 1 });
            res.status(201).json({ success: true, data: subgerencia });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al crear subgerencia' });
        }
    },

    async updateSubgerencia(req, res) {
        try {
            const subgerencia = await Subgerencia.findByPk(req.params.id);
            if (!subgerencia) return res.status(404).json({ success: false, message: 'Subgerencia no encontrada' });
            await subgerencia.update(req.body);
            res.json({ success: true, data: subgerencia });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al actualizar subgerencia' });
        }
    },

    async destroySubgerencia(req, res) {
        try {
            const subgerencia = await Subgerencia.findByPk(req.params.id);
            if (!subgerencia) return res.status(404).json({ success: false, message: 'Subgerencia no encontrada' });
            await subgerencia.update({ activo: 0 });
            res.json({ success: true, message: 'Subgerencia desactivada' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al desactivar subgerencia' });
        }
    }
};

module.exports = servicioController;
