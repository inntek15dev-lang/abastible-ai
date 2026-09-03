// IEEE Trace: REQ-007 | US-006, US-007 | usuarioController.js
const bcrypt = require('bcryptjs');
const { User, TipoContratista, Dependencia, ContratistaAsignacion, Contratista, Vinculacion, Administracion, Programa, ContratistaUsuario, VinculacionUsuario } = require('../database/models');
const emailService = require('../services/emailService');

function formatUserData(u) {
    if (!u) return u;
    const json = typeof u.toJSON === 'function' ? u.toJSON() : u;
    if (!json.id && json.usu_id) {
        json.id = json.usu_id;
    }

    // Resolutor universal para eecc_nombre
    const companyNames = new Set();
    if (json.eecc_nombre && json.eecc_nombre.trim() !== '') {
        companyNames.add(json.eecc_nombre.trim());
    }
    if (json.contratistaEntidad?.nombre) {
        companyNames.add(json.contratistaEntidad.nombre.trim());
    }
    if (json.contratistasAsignados && Array.isArray(json.contratistasAsignados)) {
        json.contratistasAsignados.forEach(c => {
            if (c.nombre) companyNames.add(c.nombre.trim());
        });
    }
    if (json.vinculacionesAsignadas && Array.isArray(json.vinculacionesAsignadas)) {
        json.vinculacionesAsignadas.forEach(vu => {
            if (vu.vinculacion?.contratista?.nombre) {
                companyNames.add(vu.vinculacion.contratista.nombre.trim());
            }
        });
    }
    if (companyNames.size > 0) {
        json.eecc_nombre = Array.from(companyNames).join(', ');
    }

    // Resolutor universal para contratista_ids y contratista_id
    const cIds = new Set();
    if (json.contratista_id) cIds.add(Number(json.contratista_id));
    if (json.contratistaEntidad?.id) cIds.add(Number(json.contratistaEntidad.id));
    if (json.contratistasAsignados && Array.isArray(json.contratistasAsignados)) {
        json.contratistasAsignados.forEach(c => { if (c.id) cIds.add(Number(c.id)); });
    }
    if (json.vinculacionesAsignadas && Array.isArray(json.vinculacionesAsignadas)) {
        json.vinculacionesAsignadas.forEach(vu => {
            if (vu.vinculacion?.contratista_id) cIds.add(Number(vu.vinculacion.contratista_id));
            if (vu.vinculacion?.contratista?.id) cIds.add(Number(vu.vinculacion.contratista.id));
        });
    }
    json.contratista_ids = Array.from(cIds);
    if (!json.contratista_id && json.contratista_ids.length > 0) {
        json.contratista_id = json.contratista_ids[0];
    }

    // Resolutor universal para vinculacion_ids y vinculacion_id
    const vIds = new Set();
    if (json.vinculacion_id) vIds.add(Number(json.vinculacion_id));
    if (json.vinculacionesAsignadas && Array.isArray(json.vinculacionesAsignadas)) {
        json.vinculacionesAsignadas.forEach(vu => {
            if (vu.vinculacion_id) vIds.add(Number(vu.vinculacion_id));
            if (vu.vinculacion?.id) vIds.add(Number(vu.vinculacion.id));
        });
    }
    json.vinculacion_ids = Array.from(vIds);
    if (!json.vinculacion_id && json.vinculacion_ids.length > 0) {
        json.vinculacion_id = json.vinculacion_ids[0];
    }

    return json;
}

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
                const { Op } = require('sequelize');
                const isUser = req.user.role === 'contratista_user';

                if (isUser) {
                    // Contratista User: su scope son las vinculaciones asignadas (N contratos)
                    // via VinculacionUsuario — nunca las columnas directas del User (siempre NULL).
                    const myVincIds = (req.user.vinculacion_ids && req.user.vinculacion_ids.length > 0)
                        ? req.user.vinculacion_ids
                        : (req.user.vinculacion_id ? [req.user.vinculacion_id] : [-1]);

                    if (req.query.role === 'administrador_contrato') {
                        const admins = await Administracion.findAll({
                            where: { activo: 1, vinculacion_id: { [Op.in]: myVincIds } },
                            attributes: ['administrador_contrato_id']
                        });
                        const adminIds = [...new Set(admins.map(a => a.administrador_contrato_id))];
                        if (adminIds.length === 0) return res.json({ success: true, data: [] });
                        where[Op.or] = [{ usu_id: adminIds }, { id: adminIds }];
                    } else {
                        // Peers: otros contratista_user asignados a las MISMAS vinculaciones,
                        // vía VinculacionUsuario — nunca por columnas null.
                        const peers = await VinculacionUsuario.findAll({
                            where: { vinculacion_id: { [Op.in]: myVincIds }, activo: 1 },
                            attributes: ['user_id']
                        });
                        const peerIds = [...new Set(peers.map(p => p.user_id))];
                        if (peerIds.length === 0) return res.json({ success: true, data: [] });
                        where[Op.or] = [{ usu_id: peerIds }, { id: peerIds }];
                    }
                } else {
                    const cIds = req.user.contratista_ids || (req.user.contratista_id ? [req.user.contratista_id] : []);
                    const admins = await Administracion.findAll({
                        include: [{
                            model: Vinculacion,
                            as: 'vinculacion',
                            where: { contratista_id: { [Op.in]: cIds }, activo: 1 },
                            required: true
                        }],
                        where: { activo: 1 },
                        attributes: ['administrador_contrato_id']
                    });
                    const adminIds = [...new Set(admins.map(a => a.administrador_contrato_id))];

                    if (req.query.role === 'administrador_contrato') {
                        if (adminIds.length === 0) return res.json({ success: true, data: [] });
                        where[Op.or] = [
                            { usu_id: adminIds },
                            { id: adminIds }
                        ];
                    } else {
                        // Standard contractor limits: only sees their own operatives
                        where.parent_id = req.user.id;
                    }
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Admin contrato usually only sees themselves in this filter, 
                // but let's allow them to see others who share the same vinculations
                const { Op } = require('sequelize');

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
                    where[Op.or] = [
                        { usu_id: adminIds },
                        { id: adminIds }
                    ];
                } else {
                    // For general user listing, they see contratista_user asignados a las
                    // vinculaciones que administran, vía VinculacionUsuario (la tabla real
                    // que puebla el sync/las asignaciones manuales; ContratistaAsignacion
                    // nunca se escribe en producción y siempre está vacía).
                    const asignaciones = await VinculacionUsuario.findAll({
                        where: { vinculacion_id: { [Op.in]: vincIds.length > 0 ? vincIds : [-1] }, activo: 1 },
                        attributes: ['user_id']
                    });
                    const assignedUserIds = [...new Set(asignaciones.map(a => a.user_id))];
                    if (assignedUserIds.length === 0) return res.json({ success: true, data: [] });
                    where[Op.or] = [
                        { usu_id: assignedUserIds },
                        { id: assignedUserIds }
                    ];
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
                    },
                    {
                        model: VinculacionUsuario,
                        as: 'vinculacionesAsignadas',
                        include: [{
                            model: Vinculacion,
                            as: 'vinculacion',
                            include: [
                                { model: Contratista, as: 'contratista', attributes: ['id', 'nombre', 'rut'] },
                                { model: TipoContratista, as: 'servicio', attributes: ['id', 'nombre'] },
                                { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] }
                            ]
                        }]
                    }
                ]
            });

            const mappedUsuarios = usuarios.map(formatUserData);

            res.json({ success: true, data: mappedUsuarios });
        } catch (error) {
            console.error('Usuarios index error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
        }
    },

    // GET /api/usuarios/:id
    async show(req, res) {
        try {
            const { Op } = require('sequelize');
            const usuario = await User.findOne({
                where: {
                    [Op.or]: [
                        { usu_id: req.params.id },
                        { id: req.params.id }
                    ]
                },
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
                    },
                    {
                        model: VinculacionUsuario,
                        as: 'vinculacionesAsignadas',
                        include: [{
                            model: Vinculacion,
                            as: 'vinculacion',
                            include: [
                                { model: Contratista, as: 'contratista', attributes: ['id', 'nombre', 'rut'] },
                                { model: TipoContratista, as: 'servicio', attributes: ['id', 'nombre'] },
                                { model: Dependencia, as: 'dependencia', attributes: ['id', 'nombre'] }
                            ]
                        }]
                    }
                ]
            });

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // SECURITY SCOPE CHECK: sin esto, cualquier usuario autenticado podía leer el
            // perfil completo (incluyendo empresa, vinculaciones y contratos) de cualquier
            // otro usuario del sistema con solo cambiar el :id de la URL (IDOR).
            const isSelf = String(usuario.usu_id) === String(req.user.id);
            if (!isSelf && !['admin', 'oval'].includes(req.user.role)) {
                if (req.user.role === 'contratista_user') {
                    let sameVinc = false;
                    const myVincIds = (req.user.vinculacion_ids && req.user.vinculacion_ids.length > 0)
                        ? req.user.vinculacion_ids
                        : (req.user.vinculacion_id ? [req.user.vinculacion_id] : []);
                    if (usuario.role === 'contratista_user' && myVincIds.length > 0) {
                        const targetVincs = await VinculacionUsuario.findAll({
                            where: { user_id: usuario.usu_id, activo: 1 },
                            attributes: ['vinculacion_id']
                        });
                        const targetVincIds = targetVincs.map(tv => Number(tv.vinculacion_id));
                        sameVinc = targetVincIds.some(tvId => myVincIds.includes(tvId));
                    }
                    if (!sameVinc) {
                        return res.status(403).json({ success: false, message: 'No tiene permiso para ver este usuario' });
                    }
                } else if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_admin_eecc') {
                    if (String(usuario.parent_id) !== String(req.user.id)) {
                        return res.status(403).json({ success: false, message: 'No tiene permiso para ver este usuario' });
                    }
                } else if (req.user.role === 'administrador_contrato') {
                    // Fuente real: Administracion (vinculacion_id que administra) ->
                    // VinculacionUsuario (contratista_user asignados a esa vinculación).
                    // ContratistaAsignacion nunca se escribe en producción y está siempre
                    // vacía, dejando a este rol sin poder ver a sus propios usuarios.
                    const myVincs = await Administracion.findAll({
                        where: { administrador_contrato_id: req.user.id, activo: 1 },
                        attributes: ['vinculacion_id']
                    });
                    const vincIds = myVincs.map(v => v.vinculacion_id);
                    const asignaciones = await VinculacionUsuario.findAll({
                        where: { vinculacion_id: { [Op.in]: vincIds.length > 0 ? vincIds : [-1] }, activo: 1 },
                        attributes: ['user_id']
                    });
                    const assignedIds = [...new Set(asignaciones.map(a => String(a.user_id)))];
                    const isDirectlyAssigned = assignedIds.includes(String(usuario.usu_id));
                    const isChildOfAssigned = usuario.parent_id && assignedIds.includes(String(usuario.parent_id));
                    if (!isDirectlyAssigned && !isChildOfAssigned) {
                        return res.status(403).json({ success: false, message: 'No tiene permiso para ver este usuario' });
                    }
                } else {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para ver este usuario' });
                }
            }

            const userData = formatUserData(usuario);

            res.json({ success: true, data: userData });
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
            }
            // Admin can create any role (except OVAL if not OVAL themselves)
            if (finalRole === 'oval' && req.user.role !== 'oval') {
                finalRole = 'admin'; // Downgrade or reject? Requirement says "invisible to admin", so admin shouldn't even know it exists.
            }

            // REGLA DE HOMOLOGACIÓN OVAL: contratista_admin y administrador_contrato son
            // identidades gestionadas EXCLUSIVAMENTE por la sincronización con OVAL. Crearlos
            // manualmente aquí produciría usuarios sin usu_id homologado que la próxima
            // re-sincronización trataría como residuales y eliminaría. La única excepción
            // manual es contratista_user (creado por un contratista_admin, ligado a una
            // vinculación/contrato específico — ver validación más abajo).
            if (['contratista_admin', 'contratista_admin_eecc', 'administrador_contrato'].includes(finalRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Los usuarios Administrador de Contratista y Administrador de Contrato se gestionan exclusivamente a través de la sincronización con OVAL. No pueden crearse manualmente.'
                });
            }

            // Enforce restriction: Only Contratista Admin (or Admin) can create contratista_user
            if (finalRole === 'contratista_user') {
                if (req.user.role !== 'contratista_admin' && req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'Solo los Administradores de Contratista pueden crear usuarios contratistas.'
                    });
                }

                // Check that vinculacion_ids (or vinculacion_id for compat) is provided
                const vinculacion_ids = req.body.vinculacion_ids || (req.body.vinculacion_id ? [req.body.vinculacion_id] : []);
                if (!vinculacion_ids || vinculacion_ids.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Al menos una vinculación es requerida para un usuario contratista.'
                    });
                }

                // Verify all vinculaciones exist and are active
                for (const vId of vinculacion_ids) {
                    const v = await Vinculacion.findByPk(vId);
                    if (!v || !v.activo) {
                        return res.status(400).json({
                            success: false,
                            message: `La vinculación ${vId} no existe o no está activa.`
                        });
                    }

                    // If created by a contratista_admin, ensure they manage this contractor
                    if (req.user.role === 'contratista_admin') {
                        const cIds = [];
                        if (Array.isArray(req.user.contratista_ids) && req.user.contratista_ids.length > 0) {
                            cIds.push(...req.user.contratista_ids.map(Number));
                        }
                        if (req.user.contratista_id && !cIds.includes(Number(req.user.contratista_id))) {
                            cIds.push(Number(req.user.contratista_id));
                        }

                        if (!cIds.includes(Number(v.contratista_id))) {
                            return res.status(403).json({
                                success: false,
                                message: 'No tiene permisos para asignar este usuario a la vinculación seleccionada.'
                            });
                        }
                    }
                }
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
                // If it is a contratista_user, these direct scoping fields are saved as null
                contratista_id: finalRole === 'contratista_user' ? null : finalContratistaId,
                tipo_contratista_id: finalRole === 'contratista_user' ? null : finalTipoContratistaId,
                dependencia_id: finalRole === 'contratista_user' ? null : finalDependenciaId,
                eecc_nombre: finalEeccNombre,
                rut,
                telefono,
                activo: 1
            });

            // If role is contratista_user, create N VinculacionUsuario records
            if (finalRole === 'contratista_user') {
                const vinculacion_ids = req.body.vinculacion_ids || (req.body.vinculacion_id ? [req.body.vinculacion_id] : []);
                const assocData = vinculacion_ids.map(vId => ({
                    user_id: usuario.usu_id,
                    vinculacion_id: Number(vId),
                    activo: 1
                }));
                await VinculacionUsuario.bulkCreate(assocData);

                // Envío de credenciales por correo. No debe bloquear la creación del
                // usuario si el correo falla (igual que el resto de notificaciones del
                // sistema, ver emailService/registroController).
                try {
                    await emailService.notifyCredencialesNuevoUsuario(usuario, password);
                } catch (emailErr) {
                    console.error('Error enviando credenciales al nuevo contratista_user:', emailErr);
                }
            }

            // Assign multiple contractors if role is contratista_admin and contratista_ids is provided
            if (finalRole === 'contratista_admin') {
                let multipleContractorIds = req.body.contratista_ids;
                if (!multipleContractorIds && finalContratistaId) {
                    multipleContractorIds = [finalContratistaId];
                }
                if (multipleContractorIds && Array.isArray(multipleContractorIds) && multipleContractorIds.length > 0) {
                    const assocData = multipleContractorIds.map(cId => ({
                        user_id: usuario.usu_id,
                        contratista_id: cId
                    }));
                    await ContratistaUsuario.bulkCreate(assocData);
                }
            }

            // Create Initial Assignment if Contractor role and data provided (for non-contratista_user only)
            if (finalRole === 'contratista_admin' && asignacion_inicial) {
                const { dependencia_id: depId, servicio_id: servId, administrador_contrato_id: adcId } = asignacion_inicial;

                if (depId && servId) {
                    await ContratistaAsignacion.create({
                        user_id: usuario.usu_id,
                        dependencia_id: depId,
                        tipo_contratista_id: servId,
                        administrador_contrato_id: adcId || null,
                        periodo_inicio: new Date()
                    });

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
            const { Op } = require('sequelize');
            const usuario = await User.findOne({
                where: {
                    [Op.or]: [
                        { usu_id: req.params.id },
                        { id: req.params.id }
                    ]
                }
            });

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const isSelf = String(usuario.usu_id) === String(req.user.id);

            // SECURITY SCOPE CHECK
            // Prevent unauthorized edits by roles with limited scope
            if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_admin_eecc') {
                // Can only edit themselves or their children (operativos)
                if (!isSelf && String(usuario.parent_id) !== String(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para editar este usuario' });
                }
            } else if (req.user.role === 'contratista_user') {
                // Can edit themselves OR peers assigned to ANY of the SAME vinculaciones.
                let isSameScope = false;
                const myVincIds = (req.user.vinculacion_ids && req.user.vinculacion_ids.length > 0)
                    ? req.user.vinculacion_ids
                    : (req.user.vinculacion_id ? [req.user.vinculacion_id] : []);
                if (usuario.role === 'contratista_user' && myVincIds.length > 0) {
                    const targetVincs = await VinculacionUsuario.findAll({
                        where: { user_id: usuario.usu_id, activo: 1 },
                        attributes: ['vinculacion_id']
                    });
                    const targetVincIds = targetVincs.map(tv => Number(tv.vinculacion_id));
                    isSameScope = targetVincIds.some(tvId => myVincIds.includes(tvId));
                }

                if (!isSelf && !isSameScope) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para editar este usuario' });
                }
            } else if (req.user.role === 'administrador_contrato') {
                // Ensure the user belongs to their assigned scope.
                // Fuente real: Administracion (vinculacion_id que administra) ->
                // VinculacionUsuario (contratista_user asignados) — ContratistaAsignacion
                // nunca se escribe en producción y está siempre vacía.
                const myVincs = await Administracion.findAll({
                    where: { administrador_contrato_id: req.user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = myVincs.map(v => v.vinculacion_id);
                const asignaciones = await VinculacionUsuario.findAll({
                    where: { vinculacion_id: { [Op.in]: vincIds.length > 0 ? vincIds : [-1] }, activo: 1 },
                    attributes: ['user_id']
                });
                const assignedIds = [...new Set(asignaciones.map(a => String(a.user_id)))];

                const isDirectlyAssigned = assignedIds.includes(String(usuario.usu_id));
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

            // REGLA DE HOMOLOGACIÓN OVAL: no permitir escalar un usuario a contratista_admin
            // o administrador_contrato vía este endpoint (esos roles solo los asigna la
            // sincronización con OVAL). Evita el bypass de crear como contratista_user y
            // luego editar el rol.
            if (updateData.role && updateData.role !== usuario.role &&
                ['contratista_admin', 'contratista_admin_eecc', 'administrador_contrato'].includes(updateData.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Los roles Administrador de Contratista y Administrador de Contrato se asignan exclusivamente a través de la sincronización con OVAL.'
                });
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

            // If role is contratista_user, handle VinculacionUsuario update (N vinculaciones)
            if (usuario.role === 'contratista_user') {
                const vinculacion_ids = req.body.vinculacion_ids || (req.body.vinculacion_id ? [req.body.vinculacion_id] : null);
                if (vinculacion_ids && Array.isArray(vinculacion_ids)) {
                    await VinculacionUsuario.destroy({ where: { user_id: usuario.usu_id } });
                    if (vinculacion_ids.length > 0) {
                        const assocData = vinculacion_ids.map(vId => ({
                            user_id: usuario.usu_id,
                            vinculacion_id: Number(vId),
                            activo: 1
                        }));
                        await VinculacionUsuario.bulkCreate(assocData);
                    }
                }
                updateData.contratista_id = null;
                updateData.tipo_contratista_id = null;
                updateData.dependencia_id = null;
            }

            await usuario.update(updateData);

            // Sync multiple contractors if role is contratista_admin
            if (usuario.role === 'contratista_admin') {
                let multipleContractorIds = req.body.contratista_ids;
                
                if (multipleContractorIds && Array.isArray(multipleContractorIds)) {
                    await ContratistaUsuario.destroy({ where: { user_id: usuario.usu_id } });
                    if (multipleContractorIds.length > 0) {
                        const assocData = multipleContractorIds.map(cId => ({
                            user_id: usuario.usu_id,
                            contratista_id: cId
                        }));
                        await ContratistaUsuario.bulkCreate(assocData);
                        
                        if (usuario.contratista_id !== multipleContractorIds[0]) {
                            await usuario.update({ contratista_id: multipleContractorIds[0] });
                        }
                    } else {
                        await usuario.update({ contratista_id: null });
                    }
                } else if (req.body.contratista_id !== undefined) {
                    const cId = req.body.contratista_id;
                    if (cId) {
                        await ContratistaUsuario.findOrCreate({
                            where: { user_id: usuario.usu_id, contratista_id: cId }
                        });
                    }
                }

                // Handle specific removal of a contractor association
                if (req.body.remove_contratista_id) {
                    const removeId = Number(req.body.remove_contratista_id);
                    await ContratistaUsuario.destroy({
                        where: { user_id: usuario.usu_id, contratista_id: removeId }
                    });

                    // If the primary contratista_id was the one removed, find another one
                    if (Number(usuario.contratista_id) === removeId) {
                        const nextAssoc = await ContratistaUsuario.findOne({
                            where: { user_id: usuario.usu_id },
                            attributes: ['contratista_id']
                        });
                        const nextId = nextAssoc ? nextAssoc.contratista_id : null;
                        await usuario.update({ contratista_id: nextId });
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
            const { Op } = require('sequelize');
            const usuario = await User.findOne({
                where: {
                    [Op.or]: [
                        { usu_id: req.params.id },
                        { id: req.params.id }
                    ]
                }
            });

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            if (String(usuario.usu_id) === String(req.user.id)) {
                return res.status(403).json({ success: false, message: 'No puede desactivar su propia cuenta' });
            }

            // SECURITY SCOPE CHECK for Contratista User
            // NUNCA comparar por contratista_id/tipo_contratista_id/dependencia_id: esas
            // columnas están siempre en NULL para contratista_user (String(null)===String(null)
            // matcheaba cualquier otro usuario, cross-tenant). El scope real es la vinculación.
            if (req.user.role === 'contratista_user') {
                let isSameScope = false;
                const myVincIds = (req.user.vinculacion_ids && req.user.vinculacion_ids.length > 0)
                    ? req.user.vinculacion_ids
                    : (req.user.vinculacion_id ? [req.user.vinculacion_id] : []);
                if (usuario.role === 'contratista_user' && myVincIds.length > 0) {
                    const targetVincs = await VinculacionUsuario.findAll({
                        where: { user_id: usuario.usu_id, activo: 1 },
                        attributes: ['vinculacion_id']
                    });
                    const targetVincIds = targetVincs.map(tv => Number(tv.vinculacion_id));
                    isSameScope = targetVincIds.some(tvId => myVincIds.includes(tvId));
                }
                if (!isSameScope) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para desactivar este usuario' });
                }
            } else if (req.user.role === 'contratista_admin' || req.user.role === 'contratista_admin_eecc') {
                // SECURITY SCOPE CHECK: sin esto, cualquier contratista_admin podía
                // desactivar usuarios de OTRA empresa con solo cambiar el :id de la URL.
                if (String(usuario.parent_id) !== String(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'No tiene permiso para desactivar este usuario' });
                }
            } else if (req.user.role === 'administrador_contrato') {
                // SECURITY SCOPE CHECK, mismo patrón que show/update: Administracion
                // (vinculacion_id que administra) -> VinculacionUsuario (usuarios asignados).
                const myVincs = await Administracion.findAll({
                    where: { administrador_contrato_id: req.user.id, activo: 1 },
                    attributes: ['vinculacion_id']
                });
                const vincIds = myVincs.map(v => v.vinculacion_id);
                const asignaciones = await VinculacionUsuario.findAll({
                    where: { vinculacion_id: { [Op.in]: vincIds.length > 0 ? vincIds : [-1] }, activo: 1 },
                    attributes: ['user_id']
                });
                const assignedIds = [...new Set(asignaciones.map(a => String(a.user_id)))];
                const isDirectlyAssigned = assignedIds.includes(String(usuario.usu_id));
                const isChildOfAssigned = usuario.parent_id && assignedIds.includes(String(usuario.parent_id));
                if (!isDirectlyAssigned && !isChildOfAssigned) {
                    return res.status(403).json({ success: false, message: 'Este usuario no está bajo su administración' });
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
