// IEEE Trace: REQ-007 | US-006, US-007 | usuarioController.js
const bcrypt = require('bcryptjs');
const { User, TipoContratista, Dependencia, ContratistaAsignacion } = require('../database/models');

const usuarioController = {
    // GET /api/usuarios
    async index(req, res) {
        try {
            let where = {}; // Default: Show all. Frontend will filter or we filter by query.

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

            // Filter by role access (RN-001)
            if (req.user.role === 'contratista_admin') {
                // Contratista admin only sees their operativos
                where.parent_id = req.user.id;
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato sees assigned contractors
                const asignaciones = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: req.user.id },
                    attributes: ['user_id']
                });
                where.id = asignaciones.map(a => a.user_id);
            }
            // Admin sees all

            const usuarios = await User.findAll({
                where,
                attributes: { exclude: ['password'] },
                include: [
                    { model: TipoContratista, as: 'tipoContratista' },
                    { model: Dependencia, as: 'dependencia' },
                    { model: User, as: 'parent', attributes: ['id', 'name', 'eecc_nombre'] }
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
                    { model: User, as: 'operativos', attributes: ['id', 'name', 'email', 'role'] }
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

            if (req.user.role === 'contratista_admin') {
                // Contratistas can only create contratista_user under themselves
                finalRole = 'contratista_user';
                finalParentId = req.user.id;
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato can create contratista_admin or contratista_user
                if (!['contratista_admin', 'contratista_user'].includes(finalRole)) {
                    finalRole = 'contratista_admin';
                }
            }
            // Admin can create any role

            const hashedPassword = await bcrypt.hash(password, 10);

            // Create User
            const usuario = await User.create({
                name,
                email,
                password: hashedPassword,
                role: finalRole,
                parent_id: finalParentId,
                tipo_contratista_id, // Backward compatibility or simple linking
                dependencia_id, // Backward compatibility
                eecc_nombre,
                rut,
                telefono,
                activo: 1
            });

            // Create Initial Assignment if Contratista Admin and data provided
            if (finalRole === 'contratista_admin' && asignacion_inicial) {
                const { dependencia_id: depId, servicio_id: servId, administrador_contrato_id: adcId } = asignacion_inicial;

                if (depId && servId) {
                    await ContratistaAsignacion.create({
                        user_id: usuario.id,
                        dependencia_id: depId,
                        tipo_contratista_id: servId,
                        administrador_contrato_id: adcId || null, // Optional ADC
                        periodo_inicio: new Date()
                    });

                    // Also update the User's direct fields for quick access (denormalization preference pending)
                    // For now, let's keep them in sync if possible
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
            const usuario = await User.findByPk(req.params.id);

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // SECURITY SCOPE CHECK
            // Prevent unauthorized edits by roles with limited scope
            if (req.user.role === 'contratista_admin') {
                // Can only edit themselves or their children (operativos)
                if (usuario.id !== req.user.id && usuario.parent_id !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para editar este usuario' });
                }
            } else if (req.user.role === 'contratista_user') {
                // Can only edit themselves
                if (usuario.id !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'Solo puede editar su propio perfil' });
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Ensure the user belongs to their assigned scope
                // Can edit: Users they are assigned to (Contractor Admin) OR children of those users.
                // Note: ADC usually doesn't have 'Usuarios' write privilege, but this is a defense-in-depth measure.
                const asignaciones = await ContratistaAsignacion.findAll({
                    where: { administrador_contrato_id: req.user.id },
                    attributes: ['user_id']
                });
                const assignedIds = asignaciones.map(a => a.user_id);

                const isDirectlyAssigned = assignedIds.includes(usuario.id);
                const isChildOfAssigned = usuario.parent_id && assignedIds.includes(usuario.parent_id);

                if (!isDirectlyAssigned && !isChildOfAssigned) {
                    return res.status(403).json({ success: false, message: 'Este usuario no está bajo su administración' });
                }
            }

            const updateData = { ...req.body };

            // Hash password if provided
            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            } else {
                delete updateData.password;
            }

            await usuario.update(updateData);

            const userData = usuario.toJSON();
            delete userData.password;

            res.json({ success: true, data: userData });
        } catch (error) {
            console.error('Usuario update error:', error);
            res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
        }
    },

    // DELETE /api/usuarios/:id (soft delete via activo=0)
    async destroy(req, res) {
        try {
            const usuario = await User.findByPk(req.params.id);

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await usuario.update({ activo: 0 });

            res.json({ success: true, message: 'Usuario desactivado' });
        } catch (error) {
            console.error('Usuario destroy error:', error);
            res.status(500).json({ success: false, message: 'Error al desactivar usuario' });
        }
    }
};

module.exports = usuarioController;
