// IEEE Trace: REQ-003 | US-003 | controllers/hallazgoController.js
const {
    Hallazgo,
    RegistroActividad,
    Registro,
    User,
    Actividad,
    Elemento,
    Programa,
    Vinculacion,
    Contratista,
    TipoContratista,
    Dependencia,
    Gerencia,
    Subgerencia,
    Compromiso
} = require('../database/models');
const { getAllowedVinculacionIds, isRegistroInScope } = require('../utils/scopeHelper');
const { getProgramaScope, scopeWhereClause } = require('../utils/programaScopeHelper');
const { Op } = require('sequelize');

const hallazgoController = {
    // GET /api/hallazgos
    async index(req, res) {
        try {
            const {
                registro_id,
                registro_actividad_id,
                estado,
                tipo,
                contratista_id,
                servicio_id,
                dependencia_id,
                gerencia_id,
                subgerencia_id,
                programa_id,
                periodo_desde,
                periodo_hasta,
                search
            } = req.query;

            const where = {};
            if (registro_id) where.registro_id = registro_id;
            if (registro_actividad_id) where.registro_actividad_id = registro_actividad_id;
            if (estado && estado !== 'todos' && estado !== 'all') where.estado = estado;
            if (tipo && tipo !== 'todos' && tipo !== 'all') where.tipo = tipo;

            if (search && search.trim()) {
                const term = `%${search.trim()}%`;
                where[Op.or] = [
                    { descripcion: { [Op.like]: term } },
                    { accion_correctiva: { [Op.like]: term } }
                ];
            }

            // SECURITY: Scope de vinculaciones según rol de usuario
            const allowedVincIds = await getAllowedVinculacionIds(req.user);
            if (allowedVincIds !== null && allowedVincIds.length === 0) {
                return res.json({ success: true, data: [] });
            }

            // Filtro global de programas (excluir huérfanos salvo solo_huerfanos === 'true')
            const soloHuerfanos = req.query.solo_huerfanos === 'true';
            const programaScope = await getProgramaScope();

            // Construir where para Vinculacion
            const vincWhere = {};
            if (contratista_id && contratista_id !== 'todos') {
                vincWhere.contratista_id = contratista_id;
            }
            if (servicio_id && servicio_id !== 'todos') {
                vincWhere.servicio_id = servicio_id;
            }
            if (dependencia_id && dependencia_id !== 'todas') {
                vincWhere.dependencia_id = dependencia_id;
            }
            if (gerencia_id && gerencia_id !== 'todas') {
                vincWhere.gerencia_id = gerencia_id;
            }
            if (subgerencia_id && subgerencia_id !== 'todas') {
                vincWhere.subgerencia_id = subgerencia_id;
            }

            // Construir where para Registro
            const registroWhere = {};
            if (allowedVincIds !== null) {
                registroWhere.contratista_asignacion_id = { [Op.in]: allowedVincIds };
            }
            registroWhere.contratista_asignacion_id = {
                ...(registroWhere.contratista_asignacion_id || {}),
                ...scopeWhereClause(programaScope.vinculacionIds, soloHuerfanos)
            };

            if (programa_id && programa_id !== 'todos') {
                registroWhere.programa_id = programa_id;
            }

            if (periodo_desde && periodo_hasta) {
                registroWhere.periodo = { [Op.between]: [periodo_desde, periodo_hasta] };
            } else if (periodo_desde) {
                registroWhere.periodo = { [Op.gte]: periodo_desde };
            } else if (periodo_hasta) {
                registroWhere.periodo = { [Op.lte]: periodo_hasta };
            }

            const hallazgos = await Hallazgo.findAll({
                where,
                include: [
                    { model: User, as: 'auditor', attributes: ['id', 'name', 'email'] },
                    { model: Compromiso, as: 'compromisos' },
                    {
                        model: RegistroActividad,
                        as: 'registroActividad',
                        include: [
                            {
                                model: Actividad,
                                as: 'actividad',
                                include: [
                                    {
                                        model: Elemento,
                                        as: 'elemento',
                                        include: [
                                            { model: Programa, as: 'programa' }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: Registro,
                        as: 'registro',
                        where: registroWhere,
                        required: true,
                        include: [
                            {
                                model: Vinculacion,
                                as: 'vinculacionEntidad',
                                where: Object.keys(vincWhere).length > 0 ? vincWhere : undefined,
                                required: Object.keys(vincWhere).length > 0,
                                include: [
                                    { model: Contratista, as: 'contratista' },
                                    { model: TipoContratista, as: 'servicio' },
                                    { model: Dependencia, as: 'dependencia' },
                                    { model: Gerencia, as: 'gerencia' },
                                    { model: Subgerencia, as: 'subgerencia' }
                                ]
                            },
                            { model: Programa, as: 'programa' }
                        ]
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            res.json({ success: true, data: hallazgos });
        } catch (error) {
            console.error('Hallazgo index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener hallazgos' });
        }
    },

    // POST /api/hallazgos
    async store(req, res) {
        try {
            const { registro_id, registro_actividad_id, tipo, descripcion, accion_correctiva, fecha_limite } = req.body;
            
            if (!registro_id || !tipo || !descripcion) {
                return res.status(400).json({ success: false, message: 'Datos incompletos para crear hallazgo' });
            }

            // SECURITY: IDOR check
            if (!(await isRegistroInScope(req.user, registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para crear un hallazgo sobre este registro' });
            }

            // Filtro global de completitud de datos
            const registroParaHallazgo = await Registro.findByPk(registro_id, { attributes: ['id', 'contratista_asignacion_id'] });
            const programaScopeStore = await getProgramaScope();
            if (!programaScopeStore.vinculacionIds.map(Number).includes(Number(registroParaHallazgo?.contratista_asignacion_id))) {
                return res.status(400).json({ success: false, message: 'El servicio de la vinculación de este registro no tiene un Programa asignado.' });
            }

            const hallazgo = await Hallazgo.create({
                registro_id,
                registro_actividad_id,
                auditor_id: req.user.id,
                tipo,
                descripcion,
                accion_correctiva,
                fecha_limite,
                estado: 'abierto'
            });

            res.status(201).json({ success: true, data: hallazgo });
        } catch (error) {
            console.error('Hallazgo store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear hallazgo' });
        }
    },

    // GET /api/hallazgos/:id
    async show(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'auditor', attributes: ['id', 'name', 'email'] },
                    { model: Compromiso, as: 'compromisos' },
                    {
                        model: RegistroActividad,
                        as: 'registroActividad',
                        include: [
                            {
                                model: Actividad,
                                as: 'actividad',
                                include: [
                                    {
                                        model: Elemento,
                                        as: 'elemento',
                                        include: [
                                            { model: Programa, as: 'programa' }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: Registro,
                        as: 'registro',
                        include: [
                            {
                                model: Vinculacion,
                                as: 'vinculacionEntidad',
                                include: [
                                    { model: Contratista, as: 'contratista' },
                                    { model: TipoContratista, as: 'servicio' },
                                    { model: Dependencia, as: 'dependencia' },
                                    { model: Gerencia, as: 'gerencia' },
                                    { model: Subgerencia, as: 'subgerencia' }
                                ]
                            },
                            { model: Programa, as: 'programa' }
                        ]
                    }
                ]
            });

            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            if (!(await isRegistroInScope(req.user, hallazgo.registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para ver este hallazgo' });
            }

            res.json({ success: true, data: hallazgo });
        } catch (error) {
            console.error('Hallazgo show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener hallazgo' });
        }
    },

    // PUT /api/hallazgos/:id
    async update(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id);
            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            if (!(await isRegistroInScope(req.user, hallazgo.registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para modificar este hallazgo' });
            }

            const updateData = { ...req.body };

            // Control automático de fecha_cierre según estado
            if (updateData.estado === 'cerrado') {
                if (!updateData.fecha_cierre) {
                    updateData.fecha_cierre = new Date();
                }
            } else if (updateData.estado && updateData.estado !== 'cerrado') {
                updateData.fecha_cierre = null;
            }

            await hallazgo.update(updateData);

            // Retornar hallazgo actualizado con relaciones completas
            const updated = await Hallazgo.findByPk(hallazgo.id, {
                include: [
                    { model: User, as: 'auditor', attributes: ['id', 'name', 'email'] },
                    { model: Compromiso, as: 'compromisos' }
                ]
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            console.error('Hallazgo update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar hallazgo' });
        }
    },

    // DELETE /api/hallazgos/:id
    async destroy(req, res) {
        try {
            const hallazgo = await Hallazgo.findByPk(req.params.id);
            if (!hallazgo) {
                return res.status(404).json({ success: false, message: 'Hallazgo no encontrado' });
            }

            if (!(await isRegistroInScope(req.user, hallazgo.registro_id))) {
                return res.status(403).json({ success: false, message: 'No tiene permiso para eliminar este hallazgo' });
            }

            await hallazgo.destroy();
            res.json({ success: true, message: 'Hallazgo eliminado' });
        } catch (error) {
            console.error('Hallazgo destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar hallazgo' });
        }
    }
};

module.exports = hallazgoController;
