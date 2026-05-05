const axios = require('axios');
const bcrypt = require('bcryptjs');
const { sequelize, Contratista, TipoContratista, Dependencia, Vinculacion, User, Administracion, Gerencia, Subgerencia } = require('../database/models');

const EXTERNAL_API_URL = process.env.PIZZA_API_URL || 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';
const API_KEY = process.env.PIZZA_API_KEY;
const ORIGIN = process.env.ORIGIN;

const normalize = (str) => str ? str.trim().toUpperCase() : '';

const compareData = async (req, res) => {
    try {
        console.log('🔄 Iniciando sincronización de datos completa...');

        let externalData;
        try {
            const response = await axios.get(EXTERNAL_API_URL, {
                headers: { 'api-key': API_KEY, 'Origin': ORIGIN }
            });
            externalData = response.data.contratistas;
        } catch (error) {
            console.warn('⚠️ Error fetching external API.', error.message);
            return res.status(500).json({ message: 'Error fetching external API' });
        }

        const extGerencias = new Map();
        const extSubgerencias = new Map();
        const extServicios = new Map();
        const extDependencias = new Map();
        const extContratistas = new Map();
        const extContratistaAdmins = new Map();
        const extVinculaciones = [];
        const extAdministradorContratos = new Map();

        externalData.forEach(c => {
            const rut = `${c.cot_rut}-${c.cot_dv}`;
            extContratistas.set(rut, { ...c, rut });

            if (c.data && c.data.contratista_admin) {
                c.data.contratista_admin.forEach(admin => {
                    if (admin.email) {
                        extContratistaAdmins.set(normalize(admin.email), {
                            nombre: admin.nombre,
                            email: admin.email,
                            rut_contratista: rut
                        });
                    }
                });
            }

            if (c.data && c.data.asignaciones) {
                c.data.asignaciones.forEach(a => {
                    if (a.gerencia) extGerencias.set(normalize(a.gerencia), a.gerencia);
                    
                    if (a.subgerencia && a.gerencia) {
                        extSubgerencias.set(normalize(a.gerencia + '|' + a.subgerencia), {
                            nombre: a.subgerencia,
                            gerencia: a.gerencia
                        });
                    }

                    if (a.servicio && a.subgerencia) {
                        extServicios.set(normalize(a.subgerencia + '|' + a.servicio), {
                            nombre: a.servicio,
                            subgerencia: a.subgerencia
                        });
                    }

                    if (a.dependencia) extDependencias.set(normalize(a.dependencia), a.dependencia);

                    if (a.servicio && a.dependencia && a.subgerencia && a.gerencia) {
                        extVinculaciones.push({
                            rut_contratista: rut,
                            servicio: normalize(a.servicio),
                            dependencia: normalize(a.dependencia),
                            subgerencia: normalize(a.subgerencia),
                            gerencia: normalize(a.gerencia),
                            numero_contrato: a.contrato || null,
                            fecha_inicio_contrato: a.fecha_inicio || null,
                            fecha_termino_contrato: a.fecha_termino || null
                        });
                        
                        if (a.administrador_contrato) {
                            a.administrador_contrato.forEach(admin => {
                                if (admin.email) {
                                    let key = normalize(admin.email);
                                    let adminObj = extAdministradorContratos.get(key);
                                    if (!adminObj) {
                                        adminObj = { nombre: admin.nombre, email: admin.email, asignaciones: [] };
                                        extAdministradorContratos.set(key, adminObj);
                                    }
                                    adminObj.asignaciones.push({
                                        rut_contratista: rut,
                                        servicio: normalize(a.servicio),
                                        dependencia: normalize(a.dependencia),
                                        subgerencia: normalize(a.subgerencia),
                                        gerencia: normalize(a.gerencia)
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });

        // Fetch Local Data
        const localGerencias = await Gerencia.findAll();
        const localSubgerencias = await Subgerencia.findAll({ include: [{ model: Gerencia, as: 'gerencia' }] });
        const localServicios = await TipoContratista.findAll({ include: [{ model: Subgerencia, as: 'subgerencia' }] });
        const localDependencias = await Dependencia.findAll();
        const localContratistas = await Contratista.findAll();
        const localUsers = await User.findAll();
        const localVinculaciones = await Vinculacion.findAll({
            include: [
                { model: Contratista, as: 'contratista' },
                { model: TipoContratista, as: 'servicio' },
                { model: Dependencia, as: 'dependencia' },
                { model: Subgerencia, as: 'subgerencia' },
                { model: Gerencia, as: 'gerencia' }
            ]
        });

        // Maps for fast lookup
        const locGerenciasMap = new Set(localGerencias.map(g => normalize(g.nombre)));
        const locSubgerenciasMap = new Set(localSubgerencias.map(s => normalize((s.gerencia ? s.gerencia.nombre : '') + '|' + s.nombre)));
        const locServiciosMap = new Set(localServicios.map(s => normalize((s.subgerencia ? s.subgerencia.nombre : '') + '|' + s.nombre)));
        const locDependenciasMap = new Set(localDependencias.map(d => normalize(d.nombre)));
        const locContratistasMap = new Set(localContratistas.map(c => c.rut));
        const locUsersMap = new Set(localUsers.map(u => normalize(u.email)));
        
        const locVinculacionesMap = new Map();
        localVinculaciones.forEach(v => {
            if (v.contratista && v.servicio && v.dependencia && v.subgerencia && v.gerencia) {
                const key = `${v.contratista.rut}|${normalize(v.servicio.nombre)}|${normalize(v.dependencia.nombre)}|${normalize(v.subgerencia.nombre)}|${normalize(v.gerencia.nombre)}`;
                locVinculacionesMap.set(key, v.numero_contrato);
            }
        });

        // 1. Gerencias
        const diffGerencias = [];
        extGerencias.forEach((name, normName) => {
            diffGerencias.push({ nombre: name, estado: locGerenciasMap.has(normName) ? 'exists' : 'new' });
        });

        // 2. Subgerencias
        const diffSubgerencias = [];
        extSubgerencias.forEach((data, normKey) => {
            diffSubgerencias.push({ nombre: data.nombre, gerencia: data.gerencia, estado: locSubgerenciasMap.has(normKey) ? 'exists' : 'new' });
        });

        // 3. Servicios
        const diffServicios = [];
        extServicios.forEach((data, normKey) => {
            diffServicios.push({ nombre: data.nombre, subgerencia: data.subgerencia, estado: locServiciosMap.has(normKey) ? 'exists' : 'new' });
        });

        // 4. Dependencias
        const diffDependencias = [];
        extDependencias.forEach((name, normName) => {
            diffDependencias.push({ nombre: name, estado: locDependenciasMap.has(normName) ? 'exists' : 'new' });
        });

        // 5. Contratistas
        const diffContratistas = [];
        extContratistas.forEach((data, rut) => {
            diffContratistas.push({ rut, nombre: data.cot_razon_social, estado: locContratistasMap.has(rut) ? 'exists' : 'new' });
        });

        // 6. Contratista Admin
        const diffContratistaAdmin = [];
        extContratistaAdmins.forEach((data, normEmail) => {
            diffContratistaAdmin.push({ ...data, estado: locUsersMap.has(normEmail) ? 'exists' : 'new' });
        });

        // 7. Vinculaciones
        const diffVinculaciones = [];
        extVinculaciones.forEach(v => {
            const key = `${v.rut_contratista}|${v.servicio}|${v.dependencia}|${v.subgerencia}|${v.gerencia}`;
            const contratistaName = extContratistas.get(v.rut_contratista)?.cot_razon_social || v.rut_contratista;
            const effectiveStartDate = v.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const effectiveEndDate = v.fecha_termino_contrato || null;

            if (!locVinculacionesMap.has(key)) {
                diffVinculaciones.push({ ...v, contratista: contratistaName, fecha_inicio_contrato: effectiveStartDate, fecha_termino_contrato: effectiveEndDate, estado: 'new' });
            } else {
                const localNum = locVinculacionesMap.get(key);
                const needsUpdate = normalize(v.numero_contrato) !== normalize(localNum);
                diffVinculaciones.push({ ...v, contratista: contratistaName, fecha_inicio_contrato: effectiveStartDate, fecha_termino_contrato: effectiveEndDate, local_numero_contrato: localNum, estado: needsUpdate ? 'updated' : 'exists' });
            }
        });

        // 8. Administrador Contrato
        const diffAdministradorContrato = [];
        extAdministradorContratos.forEach((data, normEmail) => {
            // Even if exists, we might need to sync their assignments. For now we treat exists/new for the user creation.
            // But we pass the whole object to syncData so it can update the assignments anyway.
            diffAdministradorContrato.push({ ...data, estado: locUsersMap.has(normEmail) ? 'exists' : 'new' });
        });

        res.json({
            gerencias: diffGerencias,
            subgerencias: diffSubgerencias,
            servicios: diffServicios,
            dependencias: diffDependencias,
            contratistas: diffContratistas,
            contratista_admin: diffContratistaAdmin,
            vinculaciones: diffVinculaciones,
            administrador_contrato: diffAdministradorContrato
        });

    } catch (error) {
        console.error('Error in compareData:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const syncData = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { type, items } = req.body;
        console.log(`📥 Syncing ${items.length} items of type ${type}...`);

        if (!Array.isArray(items)) throw new Error('Invalid items format');

        const defaultPasswordHash = await bcrypt.hash('User123*', 10);

        if (type === 'gerencias') {
            for (const item of items) {
                await Gerencia.findOrCreate({
                    where: { nombre: item.nombre },
                    transaction
                });
            }
        } else if (type === 'subgerencias') {
            for (const item of items) {
                const gerencia = await Gerencia.findOne({ where: { nombre: item.gerencia }, transaction });
                if (gerencia) {
                    await Subgerencia.findOrCreate({
                        where: { nombre: item.nombre, gerencia_id: gerencia.id },
                        transaction
                    });
                }
            }
        } else if (type === 'servicios') {
            for (const item of items) {
                const subgerencia = await Subgerencia.findOne({ where: { nombre: item.subgerencia }, transaction });
                if (subgerencia) {
                    await TipoContratista.findOrCreate({
                        where: { nombre: item.nombre, subgerencia_id: subgerencia.id },
                        defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                        transaction
                    });
                }
            }
        } else if (type === 'dependencias') {
            for (const item of items) {
                await Dependencia.findOrCreate({
                    where: { nombre: item.nombre },
                    defaults: { activo: 1 },
                    transaction
                });
            }
        } else if (type === 'contratistas') {
            for (const item of items) {
                if (item.rut && item.nombre) {
                    await Contratista.findOrCreate({
                        where: { rut: item.rut },
                        defaults: { nombre: item.nombre, activo: 1 },
                        transaction
                    });
                }
            }
        } else if (type === 'contratista_admin') {
            for (const item of items) {
                const contratista = await Contratista.findOne({ where: { rut: item.rut_contratista }, transaction });
                if (contratista && item.email) {
                    await User.findOrCreate({
                        where: { email: item.email },
                        defaults: {
                            name: item.nombre,
                            password: defaultPasswordHash,
                            role: 'contratista_admin',
                            contratista_id: contratista.id,
                            activo: 1
                        },
                        transaction
                    }).then(async ([user, created]) => {
                        if (!created && user.contratista_id !== contratista.id) {
                            await user.update({ contratista_id: contratista.id }, { transaction });
                        }
                    });
                }
            }
        } else if (type === 'vinculaciones') {
            for (const item of items) {
                const contratista = await Contratista.findOne({ where: { rut: item.rut_contratista }, transaction });
                const servicio = await TipoContratista.findOne({ where: { nombre: item.servicio }, transaction });
                const dependencia = await Dependencia.findOne({ where: { nombre: item.dependencia }, transaction });
                const subgerencia = await Subgerencia.findOne({ where: { nombre: item.subgerencia }, transaction });
                const gerencia = await Gerencia.findOne({ where: { nombre: item.gerencia }, transaction });

                if (contratista && servicio && dependencia && subgerencia && gerencia) {
                    const [vinculacion, created] = await Vinculacion.findOrCreate({
                        where: {
                            contratista_id: contratista.id,
                            servicio_id: servicio.id,
                            dependencia_id: dependencia.id,
                            subgerencia_id: subgerencia.id,
                            gerencia_id: gerencia.id
                        },
                        defaults: {
                            activo: 1,
                            numero_contrato: item.numero_contrato || null,
                            fecha_inicio_contrato: item.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                            fecha_termino_contrato: item.fecha_termino_contrato || null
                        },
                        transaction
                    });

                    if (!created) {
                        const updateData = {};
                        if (normalize(vinculacion.numero_contrato) !== normalize(item.numero_contrato)) updateData.numero_contrato = item.numero_contrato;
                        if (item.fecha_inicio_contrato && vinculacion.fecha_inicio_contrato !== item.fecha_inicio_contrato) updateData.fecha_inicio_contrato = item.fecha_inicio_contrato;
                        if (item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== item.fecha_termino_contrato) updateData.fecha_termino_contrato = item.fecha_termino_contrato;
                        else if (!item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== null) updateData.fecha_termino_contrato = null;

                        if (Object.keys(updateData).length > 0) {
                            await vinculacion.update(updateData, { transaction });
                        }
                    }
                }
            }
        } else if (type === 'administrador_contrato') {
            for (const item of items) {
                if (!item.email) continue;
                const [user, created] = await User.findOrCreate({
                    where: { email: item.email },
                    defaults: {
                        name: item.nombre,
                        password: defaultPasswordHash,
                        role: 'administrador_contrato',
                        activo: 1
                    },
                    transaction
                });

                if (item.asignaciones && Array.isArray(item.asignaciones)) {
                    for (const asig of item.asignaciones) {
                        const contratista = await Contratista.findOne({ where: { rut: asig.rut_contratista }, transaction });
                        const servicio = await TipoContratista.findOne({ where: { nombre: asig.servicio }, transaction });
                        const dependencia = await Dependencia.findOne({ where: { nombre: asig.dependencia }, transaction });
                        const subgerencia = await Subgerencia.findOne({ where: { nombre: asig.subgerencia }, transaction });
                        const gerencia = await Gerencia.findOne({ where: { nombre: asig.gerencia }, transaction });

                        if (contratista && servicio && dependencia && subgerencia && gerencia) {
                            const vinculacion = await Vinculacion.findOne({
                                where: {
                                    contratista_id: contratista.id,
                                    servicio_id: servicio.id,
                                    dependencia_id: dependencia.id,
                                    subgerencia_id: subgerencia.id,
                                    gerencia_id: gerencia.id
                                },
                                transaction
                            });

                            if (vinculacion) {
                                await Administracion.findOrCreate({
                                    where: {
                                        vinculacion_id: vinculacion.id,
                                        administrador_contrato_id: user.id
                                    },
                                    defaults: { activo: 1 },
                                    transaction
                                });
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();
        res.json({ success: true, message: `Synced ${items.length} items.` });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in syncData:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
};

module.exports = { compareData, syncData };
