// IEEE Trace: REQ-009 | US-051 | contratistaController.js
const { Contratista, Vinculacion, Administracion, VinculacionUsuario, User, TipoContratista, Dependencia, Programa, Gerencia, Subgerencia, sequelize } = require('../database/models');

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

            let includeVinculacion = {
                model: Vinculacion,
                as: 'vinculaciones',
                required: false,
                include: [
                    { model: TipoContratista, as: 'servicio', include: [{ model: Programa, as: 'programa', attributes: ['id', 'nombre'] }] },
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
            };

            if (role === 'administrador_contrato') {
                // Only contractors managed by this admin
                includeVinculacion.required = true;
                includeVinculacion.include[2].where = { administrador_contrato_id: id, activo: 1 };
                includeVinculacion.include[2].required = true;
            } else if (role === 'contratista_admin') {
                // Only their own companies
                const { Op } = require('sequelize');
                const cIds = req.user.contratista_ids || (contratista_id ? [contratista_id] : (req.user.contratista_id ? [req.user.contratista_id] : []));
                whereContratista.id = { [Op.in]: cIds };
            } else if (role === 'contratista_user') {
                // Only their own company, and strictly filtered vinculations if needed
                const cId = contratista_id || req.user.contratista_id;
                whereContratista.id = cId;
                includeVinculacion.where = {
                    contratista_id: cId,
                    servicio_id: req.user.tipo_contratista_id,
                    dependencia_id: req.user.dependencia_id,
                    activo: 1
                };
                includeVinculacion.required = true;
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
    async store(req, res) {
        const t = await sequelize.transaction();
        try {
            const { nombre, rut, direccion, telefono, email_contacto, vinculacion_inicial } = req.body;

            // Check RUT uniqueness
            const existing = await Contratista.findOne({ where: { rut } });
            if (existing) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'El RUT ya está registrado' });
            }

            // Create Contratista
            const contratista = await Contratista.create({
                nombre, rut, direccion, telefono, email_contacto
            }, { transaction: t });

            // Create Initial Vinculacion if provided
            if (vinculacion_inicial) {
                const { servicio_id, dependencia_id, administrador_contrato_id } = vinculacion_inicial;

                if (servicio_id && dependencia_id) {
                    const vinculacion = await Vinculacion.create({
                        contratista_id: contratista.id,
                        servicio_id,
                        dependencia_id
                    }, { transaction: t });

                    // Add Admin if provided
                    if (administrador_contrato_id) {
                        await Administracion.create({
                            vinculacion_id: vinculacion.id,
                            administrador_contrato_id
                        }, { transaction: t });
                    }
                }
            }

            await t.commit();

            // Re-fetch to normalize response
            const newContratista = await Contratista.findByPk(contratista.id, {
                include: [{ model: Vinculacion, as: 'vinculaciones' }]
            });

            res.status(201).json({ success: true, data: newContratista });
        } catch (error) {
            await t.rollback();
            console.error('Contratista store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear contratista' });
        }
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
    async assignAdmin(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { administrador_contrato_id } = req.body;

            if (!administrador_contrato_id) {
                return res.status(400).json({ success: false, message: 'ID de administrador es requerido' });
            }

            const contratista = await Contratista.findByPk(id, {
                include: [{ model: Vinculacion, as: 'vinculaciones', where: { activo: 1 }, required: false }]
            });

            if (!contratista) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Contratista no encontrado' });
            }

            if (!contratista.vinculaciones || contratista.vinculaciones.length === 0) {
                // If no vinculaciones, create a default one
                const defaultServicio = await TipoContratista.findOne({ where: { nombre: 'MANTENIMIENTO' }, transaction });
                const defaultDependencia = await Dependencia.findOne({ where: { nombre: 'TRANSVERSAL NACIONAL' }, transaction });

                if (!defaultServicio || !defaultDependencia) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'No se encontraron servicios o dependencias por defecto. Cree una vinculación manualmente.' });
                }

                const newVinc = await Vinculacion.create({
                    contratista_id: id,
                    servicio_id: defaultServicio.id,
                    dependencia_id: defaultDependencia.id,
                    activo: 1
                }, { transaction });

                contratista.vinculaciones = [newVinc];
            }

            // For each active vinculacion, update or create the administration
            for (const vinc of contratista.vinculaciones) {
                // Check if this admin is already assigned to this vinculacion
                const existing = await Administracion.findOne({
                    where: { vinculacion_id: vinc.id, administrador_contrato_id, activo: 1 },
                    transaction
                });

                if (!existing) {
                    // Append new administration
                    await Administracion.create({
                        vinculacion_id: vinc.id,
                        administrador_contrato_id,
                        activo: 1
                    }, { transaction });
                }
            }

            await transaction.commit();
            res.json({ success: true, message: 'Administrador asignado correctamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('Contratista assignAdmin error:', error);
            res.status(500).json({ success: false, message: 'Error al asignar administrador' });
        }
    },

    // DELETE /api/contratistas/:id/admin/:adminId
    async removeAdmin(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id, adminId } = req.params;

            const contratista = await Contratista.findByPk(id, {
                include: [{ model: Vinculacion, as: 'vinculaciones', where: { activo: 1 }, required: false }]
            });

            if (!contratista) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Contratista no encontrado' });
            }

            if (contratista.vinculaciones && contratista.vinculaciones.length > 0) {
                for (const vinc of contratista.vinculaciones) {
                    await Administracion.update(
                        { activo: 0 },
                        { where: { vinculacion_id: vinc.id, administrador_contrato_id: adminId, activo: 1 }, transaction }
                    );
                }
            }

            await transaction.commit();
            res.json({ success: true, message: 'Administrador eliminado correctamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('Contratista removeAdmin error:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar administrador' });
        }
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
