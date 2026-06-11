// IEEE Trace: REQ-007 | US-006, US-007 | usuarioController.js
const bcrypt = require('bcryptjs');
const { User, TipoContratista, Dependencia, ContratistaAsignacion, Contratista, Vinculacion, Administracion, Programa, ContratistaUsuario } = require('../database/models');

const usuarioController = {
    // GET /api/usuarios
    async index(req, res) {
        try {
            let where = {}; 
            
            // SECURITY: Hide OVAL users from everyone except other OVAL users
            if (req.user.role !== 'oval') {
                const { Op } = require('sequelize');
                where.role = { [Op.ne]: 'oval' };
            }

            // If not admin, maybe restrict? 
            // Current logic was: let where = { activo: 1 };
            // We want to allow toggling, so we should return all, or handle 'active' query param.

            if (req.query.role) {
                where.role = req.query.role;
            }

            if (req.query.active === 'true') {
                where.activo = 1;
            }
            // If req.query.active is not set, we return ALL (for admins to see inactive ones)

            if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_user') {
                // Contratistas only see admins assigned to THEIR vinculations
                // const { Vinculacion, Administracion } = require('../database/models'); // Imported at top
                const { Op } = require('sequelize');
                const isUser = req.user.role === 'contratista_user';
                const cIds = isUser ? [req.user.contratista_id] : (req.user.contratista_ids || (req.user.contratista_id ? [req.user.contratista_id] : []));

                const adminsSearchWhere = { activo: 1 };
                const vincSearchWhere = { contratista_id: { [Op.in]: cIds }, activo: 1 };

                if (isUser) {
                    // Contratista User: only see users within their SAME vinculation (service/dependencia)
                    vincSearchWhere.servicio_id = req.user.tipo_contratista_id;
                    vincSearchWhere.dependencia_id = req.user.dependencia_id;
                    
                    // Also filter the User query to only show those with same service/dep
                    where.tipo_contratista_id = req.user.tipo_contratista_id;
                    where.dependencia_id = req.user.dependencia_id;
                    where.contratista_id = req.user.contratista_id;
                }

                const admins = await Administracion.findAll({
                    include: [{
                        model: Vinculacion,
                        as: 'vinculacion',
                        where: vincSearchWhere,
                        required: true
                    }],
                    where: adminsSearchWhere,
                    attributes: ['administrador_contrato_id']
                });
                const adminIds = [...new Set(admins.map(a => a.administrador_contrato_id))];

                if (req.query.role === 'administrador_contrato') {
                    if (adminIds.length === 0) return res.json({ success: true, data: [] });
                    where.id = adminIds;
                } else {
                    // Standard contractor limits: only sees their own operatives
                    // Unless it's a contratista_user who needs to see all peers in same vinculation (PARKO)
                    if (!isUser) {
                        where.parent_id = req.user.id;
                    }
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato usually only sees themselves in this filter, 
                // but let's allow them to see others who share the same vinculations

                const myVincs = await Administracion.findAll({
                    where: { administrador_contrato_id: req.user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = myVincs.map(v => v.vinculacion_id);

                const peerAdmins = await Administracion.findAll({
                    where: { vinculacion_id: vincIds, activo: 1 },
                    attributes: ['administrador_contrato_id']
                });
                const adminIds = [...new Set(peerAdmins.map(a => a.administrador_contrato_id))];

                if (req.query.role === 'administrador_contrato') {
                    where.id = adminIds;
                } else {
                    // For general user listing, they see users assigned to them
                    const asignaciones = await ContratistaAsignacion.findAll({
                        where: { administrador_contrato_id: req.user.id },
                        attributes: ['user_id']
                    });
                    where.id = asignaciones.map(a => a.user_id);
                }
            }
            // Admin sees all

            const usuarios = await User.findAll({
                where,
                attributes: { exclude: ['password'] },
                include: [
                    { model: TipoContratista, as: 'tipoContratista' },
                    { model: Dependencia, as: 'dependencia' },
                    { model: User, as: 'parent', attributes: ['id', 'name', 'eecc_nombre'] },
                    {
                        model: Contratista,
                        as: 'contratistasAsignados',
                        attributes: ['id', 'rut', 'nombre'],
                        through: { attributes: [] }
                    }
                ]
            });

            res.json({ success: true, data: usuarios });
        } catch (error) {
            console.error('Usuarios index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
        }
    },

    // GET /api/usuarios/:id
    async show(req, res) {
        try {
            const usuario = await User.findByPk(req.params.id, {
                attributes: { exclude: ['password'] },
                include: [
                    { model: TipoContratista, as: 'tipoContratista' },
                    { model: Dependencia, as: 'dependencia' },
                    { model: User, as: 'operativos', attributes: ['id', 'name', 'email', 'role'] },
                    {
                        model: Contratista,
                        as: 'contratistaEntidad',
                        include: [
                            {
                                model: Vinculacion,
                                as: 'vinculaciones',
                                include: [
                                    {
                                        model: TipoContratista,
                                        as: 'servicio',
                                        include: [{ model: Programa, as: 'programa' }]
                                    },
                                    { model: Dependencia, as: 'dependencia' }
                                ]
                            }
                        ]
                    },
                    {
                        model: Contratista,
                        as: 'contratistasAsignados',
                        attributes: ['id', 'rut', 'nombre'],
                        through: { attributes: [] }
                    }
                ]
            });

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            res.json({ success: true, data: usuario });
        } catch (error) {
            console.error('Usuario show error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener usuario' });
        }
    },

    // POST /api/usuarios
    async store(req, res) {
        try {
            const {
                name, email, password, role,
                tipo_contratista_id, dependencia_id,
                eecc_nombre, rut, telefono, parent_id,
                contratista_id, // Add this
                asignacion_inicial // New object { dependencia_id, servicio_id, administrador_contrato_id }
            } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, email y contraseña son requeridos'
                });
            }

            // Check if email exists
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'El email ya está registrado' });
            }

            // Role restrictions (RN-001)
            let finalRole = role || 'contratista_user';
            let finalParentId = parent_id;

            if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_admin_eecc' || req.user.role === 'contratista_user') {
                // Contractor roles can only create users under their same company/link
                finalRole = 'contratista_user';
                finalParentId = req.user.parent_id || req.user.id; // Usually link to their admin or themselves
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato can create contratista_admin, contratista_admin_eecc or contratista_user
                if (!['contratista_admin', 'contratista_admin_eecc', 'contratista_user'].includes(finalRole)) {
                    finalRole = 'contratista_admin';
                }
            }
            // Admin can create any role (except OVAL if not OVAL themselves)
            if (finalRole === 'oval' && req.user.role !== 'oval') {
                finalRole = 'admin'; // Downgrade or reject? Requirement says "invisible to admin", so admin shouldn't even know it exists.
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Inherit scope for contractor roles
            const isContractor = ['contratista_admin', 'contratista_user'].includes(req.user.role);
            const finalContratistaId = isContractor ? req.user.contratista_id : contratista_id;
            const finalTipoContratistaId = isContractor ? req.user.tipo_contratista_id : tipo_contratista_id;
            const finalDependenciaId = isContractor ? req.user.dependencia_id : dependencia_id;
            const finalEeccNombre = isContractor ? req.user.eecc_nombre : eecc_nombre;

            // Create User
            const usuario = await User.create({
                name,
                email,
                password: hashedPassword,
                role: finalRole,
                parent_id: finalParentId,
                contratista_id: finalContratistaId,
                tipo_contratista_id: finalTipoContratistaId,
                dependencia_id: finalDependenciaId,
                eecc_nombre: finalEeccNombre,
                rut,
                telefono,
                activo: 1
            });

            // Assign multiple contractors if role is contratista_admin and contratista_ids is provided
            if (finalRole === 'contratista_admin') {
                let multipleContractorIds = req.body.contratista_ids;
                if (!multipleContractorIds && finalContratistaId) {
                    multipleContractorIds = [finalContratistaId];
                }
                if (multipleContractorIds && Array.isArray(multipleContractorIds) && multipleContractorIds.length > 0) {
                    const assocData = multipleContractorIds.map(cId => ({
                        user_id: usuario.id,
                        contratista_id: cId
                    }));
                    await ContratistaUsuario.bulkCreate(assocData);
                }
            }

            // Create Initial Assignment if Contractor role and data provided
            if (['contratista_admin', 'contratista_user'].includes(finalRole) && asignacion_inicial) {
                const { dependencia_id: depId, servicio_id: servId, administrador_contrato_id: adcId } = asignacion_inicial;

                if (depId && servId) {
                    if (finalRole === 'contratista_admin') {
                        await ContratistaAsignacion.create({
                            user_id: usuario.id,
                            dependencia_id: depId,
                            tipo_contratista_id: servId,
                            administrador_contrato_id: adcId || null, // Optional ADC
                            periodo_inicio: new Date()
                        });
                    }

                    // Always update the User's direct fields for scoping
                    await usuario.update({
                        dependencia_id: depId,
                        tipo_contratista_id: servId
                    });
                }
            }

            const userData = usuario.toJSON();
            delete userData.password;

            res.status(201).json({ success: true, data: userData });
        } catch (error) {
            console.error('Usuario store error:', error);
            res.status(500).json({ success: false, message: 'Error al crear usuario' });
        }
    },

    // PUT /api/usuarios/:id
    async update(req, res) {
        try {
            const updateData = req.body;
            const usuario = await User.findByPk(req.params.id);

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const isSelf = String(usuario.id) === String(req.user.id);

            // SECURITY SCOPE CHECK
            // Prevent unauthorized edits by roles with limited scope
            if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_admin_eecc') {
                // Can only edit themselves or their children (operativos)
                if (!isSelf && String(usuario.parent_id) !== String(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para editar este usuario' });
                }
            } else if (req.user.role === 'contratista_user') {
                // Can edit themselves OR users in their same company+service+dependencia
                const isSameScope = String(usuario.contratista_id) === String(req.user.contratista_id) && 
                                   String(usuario.tipo_contratista_id) === String(req.user.tipo_contratista_id) &&
                                   String(usuario.dependencia_id) === String(req.user.dependencia_id);
                                   
                if (!isSelf && !isSameScope) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para editar este usuario' });
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Ensure the user belongs to their assigned scope
                // Can edit: Themselves OR Users they are assigned to (Contractor Admin) OR children of those users.
                const asignaciones = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: req.user.id },
                    attributes: ['user_id']
                });
                const assignedIds = asignaciones.map(a => String(a.user_id));

                const isDirectlyAssigned = assignedIds.includes(String(usuario.id));
                const isChildOfAssigned = usuario.parent_id && assignedIds.includes(String(usuario.parent_id));

                if (!isSelf && !isDirectlyAssigned && !isChildOfAssigned) {
                    return res.status(403).json({ success: false, message: 'Este usuario no está bajo su administración' });
                }
            }

            // SECURITY SCOPE CHECK: Prevent self-deactivation
            if (updateData.activo === 0 || updateData.activo === false) {
                if (isSelf) {
                    return res.status(403).json({ success: false, message: 'No puede desactivar su propia cuenta' });
                }
            }

            // Hash password if provided
            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            } else {
                delete updateData.password;
            }

            // Sanitize foreign keys: convert empty strings to null
            const foreignKeys = ['tipo_contratista_id', 'dependencia_id', 'contratista_id', 'parent_id'];
            foreignKeys.forEach(key => {
                if (updateData[key] === '') {
                    updateData[key] = null;
                }
            });

            // Remove id from updateData to prevent primary key issues
            delete updateData.id;

            await usuario.update(updateData);

            // Sync multiple contractors if role is contratista_admin
            if (usuario.role === 'contratista_admin') {
                let multipleContractorIds = req.body.contratista_ids;
                // If not explicitly sent but a single contratista_id was updated, sync it
                if (!multipleContractorIds && updateData.contratista_id) {
                    multipleContractorIds = [updateData.contratista_id];
                }
                if (multipleContractorIds && Array.isArray(multipleContractorIds)) {
                    await ContratistaUsuario.destroy({ where: { user_id: usuario.id } });
                    if (multipleContractorIds.length > 0) {
                        const assocData = multipleContractorIds.map(cId => ({
                            user_id: usuario.id,
                            contratista_id: cId
                        }));
                        await ContratistaUsuario.bulkCreate(assocData);
                    }
                }
            }

            const userData = usuario.toJSON();
            delete userData.password;

            res.json({ success: true, data: userData });
        } catch (error) {
            console.error('Usuario update error:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El email ya está en uso por otro usuario' 
                });
            }

            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Error de validación: ' + error.errors.map(e => e.message).join(', ') 
                });
            }

            res.status(500).json({ 
                success: false, 
                message: 'Error al actualizar usuario',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // DELETE /api/usuarios/:id (soft delete via activo=0)
    async destroy(req, res) {
        try {
            const usuario = await User.findByPk(req.params.id);

            if (String(usuario.id) === String(req.user.id)) {
                return res.status(403).json({ success: false, message: 'No puede desactivar su propia cuenta' });
            }
            
            // SECURITY SCOPE CHECK for Contratista User
            if (req.user.role === 'contratista_user') {
                 const isSameScope = String(usuario.contratista_id) === String(req.user.contratista_id) && 
                                   String(usuario.tipo_contratista_id) === String(req.user.tipo_contratista_id) &&
                                   String(usuario.dependencia_id) === String(req.user.dependencia_id);
                if (!isSameScope) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para desactivar este usuario' });
                }
            }

            await usuario.update({ activo: 0 });

            res.json({ success: true, message: 'Usuario desactivado' });
        } catch (error) {
            console.error('Usuario destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al desactivar usuario' });
        }
    },

    // GET /api/usuarios/:id/asignaciones
    async asignaciones(req, res) {
        try {
            const asignaciones = await ContratistaAsignacion.findAll({
                where: { user_id: req.params.id },
                include: [
                    { model: TipoContratista, as: 'tipoContratista' },
                    { model: Dependencia, as: 'dependencia' }
                ]
            });
            res.json({ success: true, data: asignaciones });
        } catch (error) {
            console.error('Usuario asignaciones error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener asignaciones' });
        }
    }
};

module.exports = usuarioController;
