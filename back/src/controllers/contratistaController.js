// IEEE Trace: REQ-009 | US-051 | contratistaController.js
const { Contratista, Vinculacion, Administracion, VinculacionUsuario, User, TipoContratista, Dependencia, Programa, Gerencia, Subgerencia } = require('../database/models');

const contratistaController = {
    // GET /api/contratistas
    async index(req, res) {
        try {
            const { role, id, contratista_id } = req.user;
            const { activo } = req.query;
            
            let whereContratista = {};
            if (activo !== undefined) {
                whereContratista.activo = activo === 'true' || activo === '1' ? 1 : 0;
            }

            const includeAdministraciones = {
                model: Administracion,
                as: 'administraciones',
                where: { activo: 1 },
                required: false,
                include: [
                    { model: User, as: 'administradorContrato', attributes: ['id', 'name', 'email'] }
                ]
            };

            let includeVinculacion = {
                model: Vinculacion,
                as: 'vinculaciones',
                required: false,
                include: [
                    { model: TipoContratista, as: 'servicio', include: [{ model: Programa, as: 'programa', attributes: ['id', 'nombre'] }] },
                    { model: Dependencia, as: 'dependencia' },
                    { model: Gerencia, as: 'gerencia' },
                    { model: Subgerencia, as: 'subgerencia' },
                    includeAdministraciones,
                    {
                        model: VinculacionUsuario,
                        as: 'usuariosVinculados',
                        where: { activo: 1 },
                        required: false,
                        include: [
                            { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'role'] }
                        ]
                    }
                ]
            };

            if (role === 'administrador_contrato') {
                console.log(`[Contratista Controller - GET /api/contratistas] User is administrador_contrato (ID: ${id}). Filtering contractors managed by admin.`);
                includeVinculacion.required = true;
                includeAdministraciones.where = { administrador_contrato_id: id, activo: 1 };
                includeAdministraciones.required = true;
            } else if (role === 'contratista_admin') {
                const { Op } = require('sequelize');
                const cIds = [];
                if (Array.isArray(req.user.contratista_ids) && req.user.contratista_ids.length > 0) {
                    cIds.push(...req.user.contratista_ids.map(Number));
                }
                if (req.user.contratista_id && !cIds.includes(Number(req.user.contratista_id))) {
                    cIds.push(Number(req.user.contratista_id));
                }
                if (contratista_id && !cIds.includes(Number(contratista_id))) {
                    cIds.push(Number(contratista_id));
                }
                console.log(`[Contratista Controller - GET /api/contratistas] User is contratista_admin (ID: ${id}). Allowed contratista_ids: [${cIds.join(', ')}]. Filtering whereContratista.id IN (${cIds.join(', ')})`);
                whereContratista.id = { [Op.in]: cIds.length > 0 ? cIds : [-1] };
            } else if (role === 'contratista_user') {
                // Only their own company, and strictly filtered vinculations if needed
                const cId = contratista_id || req.user.contratista_id;
                console.log(`[Contratista Controller - GET /api/contratistas] User is contratista_user (ID: ${id}). Allowed contratista_id: ${cId}.`);
                whereContratista.id = cId;
                includeVinculacion.where = {
                     contratista_id: cId,
                     servicio_id: req.user.tipo_contratista_id,
                     dependencia_id: req.user.dependencia_id,
                     activo: 1
                };
                includeVinculacion.required = true;
            } else {
                console.log(`[Contratista Controller - GET /api/contratistas] User role: ${role} (ID: ${id}). No specific role filter applied to Contratista query.`);
            }

            const contratistas = await Contratista.findAll({
                where: whereContratista,
                include: [
                    includeVinculacion,
                    { 
                        model: User, 
                        as: 'usuariosAsignados', 
                        where: { role: 'contratista_admin', activo: 1 }, 
                        required: false,
                        through: { attributes: [] },
                        attributes: ['id', 'name', 'email', 'role']
                    }
                ]
            });

            const mappedData = contratistas.map(c => {
                const json = c.toJSON();
                json.usuarios = json.usuariosAsignados || [];
                return json;
            });

            res.json({ success: true, data: mappedData });
        } catch (error) {
            console.error('Contratistas index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener contratistas' });
        }
    },

    // GET /api/contratistas/:id
    async show(req, res) {
        try {
            const contratista = await Contratista.findByPk(req.params.id, {
                include: [
                    {
                        model: User,
                        as: 'usuariosAsignados',
                        where: { role: 'contratista_admin', activo: 1 },
                        required: false,
                        through: { attributes: [] },
                        attributes: ['id', 'name', 'email', 'role']
                    },
                    {
                        model: Vinculacion,
                        as: 'vinculaciones',
                        where: { activo: 1 },
                        required: false,
                        include: [
                            { model: TipoContratista, as: 'servicio' },
                            { model: Dependencia, as: 'dependencia' },
                            { model: Gerencia, as: 'gerencia' },
                            { model: Subgerencia, as: 'subgerencia' },
                            {
                                model: Administracion,
                                as: 'administraciones',
                                where: { activo: 1 },
                                required: false,
                                include: [
                                    { model: User, as: 'administradorContrato', attributes: ['id', 'name', 'email'] }
                                ]
                            },
                            {
                                model: VinculacionUsuario,
                                as: 'usuariosVinculados',
                                where: { activo: 1 },
                                required: false,
                                include: [
                                    { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'role'] }
                                ]
                            }
                        ]
                    }
                ]
            });

            if (!contratista) {
                return res.status(404).json({ success: false, message: 'Contratista no encontrado' });
            }

            const json = contratista.toJSON();
            json.usuarios = json.usuariosAsignados || [];

            res.json({ success: true, data: json });
        } catch (error) {
            console.error('Contratista show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener contratista' });
        }
    },

    // POST /api/contratistas
    // BLOQUEADO: las empresas contratistas se gestionan exclusivamente a través de la
    // sincronización con OVAL (fuente de verdad única). Crear una manualmente la dejaría
    // sin homologación con OVAL, y la próxima re-sincronización la trataría como residual
    // y la eliminaría.
    async store(req, res) {
        return res.status(403).json({
            success: false,
            message: 'Las empresas contratistas se gestionan exclusivamente a través de la sincronización con OVAL. No pueden crearse manualmente.'
        });
    },

    // PUT /api/contratistas/:id
    async update(req, res) {
        try {
            const contratista = await Contratista.findByPk(req.params.id);
            if (!contratista) {
                return res.status(404).json({ success: false, message: 'Contratista no encontrado' });
            }

            await contratista.update(req.body);
            res.json({ success: true, data: contratista });
        } catch (error) {
            console.error('Contratista update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar contratista' });
        }
    },

    // POST /api/contratistas/:id/admin
    // BLOQUEADO: la asignación de administrador de contrato a una vinculación es data
    // que reporta OVAL (administrador_contrato dentro de cada asignación) y se gestiona
    // exclusivamente vía sincronización. Esta ruta además creaba vinculaciones "default"
    // inventadas cuando la empresa no tenía ninguna, lo cual viola que las vinculaciones
    // solo pueden originarse en OVAL.
    async assignAdmin(req, res) {
        return res.status(403).json({
            success: false,
            message: 'La asignación de administradores de contrato se gestiona exclusivamente a través de la sincronización con OVAL. No puede realizarse manualmente.'
        });
    },

    // DELETE /api/contratistas/:id/admin/:adminId
    // BLOQUEADO: mismo motivo que assignAdmin.
    async removeAdmin(req, res) {
        return res.status(403).json({
            success: false,
            message: 'La asignación de administradores de contrato se gestiona exclusivamente a través de la sincronización con OVAL. No puede modificarse manualmente.'
        });
    },
    // DELETE /api/contratistas/:id
    async destroy(req, res) {
        try {
            const contratista = await Contratista.findByPk(req.params.id);
            if (!contratista) {
                return res.status(404).json({ success: false, message: 'Contratista no encontrado' });
            }

            await contratista.update({ activo: 0 });
            // Should we also soft delete vinculaciones? Maybe yes.
            await Vinculacion.update({ activo: 0 }, { where: { contratista_id: contratista.id } });

            res.json({ success: true, message: 'Contratista eliminado' });
        } catch (error) {
            console.error('Contratista destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar contratista' });
        }
    }
};

module.exports = contratistaController;
