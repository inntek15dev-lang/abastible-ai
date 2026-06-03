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

        const response = await axios.get(EXTERNAL_API_URL, {
            headers: { 'api-key': API_KEY, 'Origin': ORIGIN }
        });
        const fullResponse = response.data;
        const externalContratistas = fullResponse.contratistas || [];

        const extGerencias = new Map();
        const extSubgerencias = new Map();
        const extServicios = new Map();
        const extDependencias = new Map();
        const extContratistas = new Map();
        const extContratistaAdmins = new Map();
        const extVinculaciones = [];
        const extAdministradorContratos = new Map();

        // 1. Process Top-Level Arrays (New standard)
        if (fullResponse.gerencias) {
            fullResponse.gerencias.forEach(g => {
                if (g.nombre) extGerencias.set(normalize(g.nombre), g.nombre);
            });
        }

        if (fullResponse.subgerencias) {
            fullResponse.subgerencias.forEach(s => {
                if (s.nombre && s.gerencia) {
                    extSubgerencias.set(normalize(s.gerencia + '|' + s.nombre), {
                        nombre: s.nombre,
                        gerencia: s.gerencia
                    });
                    extGerencias.set(normalize(s.gerencia), s.gerencia);
                }
            });
        }

        if (fullResponse.servicios) {
            fullResponse.servicios.forEach(s => {
                if (s.nombre && s.subgerencia) {
                    extServicios.set(normalize(s.subgerencia + '|' + s.nombre), {
                        nombre: s.nombre,
                        subgerencia: s.subgerencia
                    });
                }
            });
        }

        if (fullResponse.dependencias) {
            fullResponse.dependencias.forEach(d => {
                if (d.nombre) extDependencias.set(normalize(d.nombre), d.nombre);
            });
        }

        if (fullResponse.contratista_admin) {
            fullResponse.contratista_admin.forEach(admin => {
                if (admin.email) {
                    extContratistaAdmins.set(normalize(admin.email), {
                        nombre: admin.nombre,
                        email: admin.email,
                        rut_contratista: admin.rut_contratista
                    });
                }
            });
        }

        if (fullResponse.administrador_contrato) {
            fullResponse.administrador_contrato.forEach(admin => {
                if (admin.email) {
                    let key = normalize(admin.email);
                    extAdministradorContratos.set(key, {
                        nombre: admin.nombre,
                        email: admin.email,
                        asignaciones: admin.asignaciones || []
                    });
                }
            });
        }

        if (fullResponse.vinculaciones) {
            fullResponse.vinculaciones.forEach(v => {
                extVinculaciones.push({
                    rut_contratista: v.rut_contratista,
                    servicio: normalize(v.servicio),
                    dependencia: normalize(v.dependencia),
                    subgerencia: normalize(v.subgerencia),
                    gerencia: normalize(v.gerencia),
                    numero_contrato: v.numero_contrato || null,
                    fecha_inicio_contrato: v.fecha_inicio_contrato || null,
                    fecha_termino_contrato: v.fecha_termino_contrato || null
                });
            });
        }

        // 2. Process Contratistas and Nested Data (Legacy/Backup)
        externalContratistas.forEach(c => {
            let rut = c.rut;
            if (!rut && c.cot_rut) {
                rut = `${c.cot_rut}-${c.cot_dv}`;
            }
            if (!rut) return;

            const nombre = c.nombre || c.cot_razon_social;
            extContratistas.set(rut, { ...c, rut, nombre });

            const admins = c.contratista_admin || (c.data && c.data.contratista_admin);
            if (admins && Array.isArray(admins)) {
                admins.forEach(admin => {
                    if (admin.email) {
                        extContratistaAdmins.set(normalize(admin.email), {
                            nombre: admin.nombre,
                            email: admin.email,
                            rut_contratista: rut
                        });
                    }
                });
            }

            const asigs = c.asignaciones || (c.data && c.data.asignaciones);
            if (asigs && Array.isArray(asigs)) {
                asigs.forEach(a => {
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
                            subgerencia: a.subgerencia,
                            gerencia: a.gerencia
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
                            fecha_termino_contrato: a.fecha_termino || null,
                            contratista: nombre
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

        const diffContratistas = [];
        extContratistas.forEach((data, rut) => {
            diffContratistas.push({ ...data, rut, nombre: data.nombre, estado: locContratistasMap.has(rut) ? 'exists' : 'new' });
        });

        const diffContratistaAdmin = [];
        extContratistaAdmins.forEach((data, normEmail) => {
            diffContratistaAdmin.push({ ...data, estado: locUsersMap.has(normEmail) ? 'exists' : 'new' });
        });

        const diffVinculaciones = [];
        extVinculaciones.forEach(v => {
            const key = `${v.rut_contratista}|${normalize(v.servicio)}|${normalize(v.dependencia)}|${normalize(v.subgerencia)}|${normalize(v.gerencia)}`;
            const cData = extContratistas.get(v.rut_contratista);
            const contratistaName = cData ? (cData.nombre || cData.cot_razon_social) : v.rut_contratista;
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

        const diffAdministradorContrato = [];
        extAdministradorContratos.forEach((data, normEmail) => {
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
                let gerencia = await Gerencia.findOne({ where: { nombre: item.gerencia }, transaction });
                if (!gerencia) {
                    gerencia = await Gerencia.create({ nombre: item.gerencia, activo: 1 }, { transaction });
                }
                await Subgerencia.findOrCreate({
                    where: { nombre: item.nombre, gerencia_id: gerencia.id },
                    transaction
                });
            }
        } else if (type === 'servicios') {
            for (const item of items) {
                let gerencia = null;
                if (item.gerencia) {
                    gerencia = await Gerencia.findOne({ where: { nombre: item.gerencia }, transaction });
                    if (!gerencia) {
                        gerencia = await Gerencia.create({ nombre: item.gerencia, activo: 1 }, { transaction });
                    }
                }
                let subgerencia = await Subgerencia.findOne({ where: { nombre: item.subgerencia }, transaction });
                if (!subgerencia) {
                    subgerencia = await Subgerencia.create({
                        nombre: item.subgerencia,
                        gerencia_id: gerencia ? gerencia.id : null,
                        activo: 1
                    }, { transaction });
                }
                await TipoContratista.findOrCreate({
                    where: { nombre: item.nombre, subgerencia_id: subgerencia.id },
                    defaults: { descripcion: 'Sincronizado desde API', activo: 1 },
                    transaction
                });
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
                let contratista = await Contratista.findOne({ where: { rut: item.rut_contratista }, transaction });
                if (!contratista) {
                    contratista = await Contratista.create({
                        rut: item.rut_contratista,
                        nombre: item.contratista || item.rut_contratista || 'Empresa Sincronizada',
                        activo: 1
                    }, { transaction });
                }
                if (item.email) {
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
                let gerencia = await Gerencia.findOne({ where: { nombre: item.gerencia }, transaction });
                if (!gerencia) {
                    gerencia = await Gerencia.create({ nombre: item.gerencia, activo: 1 }, { transaction });
                }

                let subgerencia = await Subgerencia.findOne({ where: { nombre: item.subgerencia, gerencia_id: gerencia.id }, transaction });
                if (!subgerencia) {
                    subgerencia = await Subgerencia.create({ nombre: item.subgerencia, gerencia_id: gerencia.id, activo: 1 }, { transaction });
                }

                let servicio = await TipoContratista.findOne({ where: { nombre: item.servicio, subgerencia_id: subgerencia.id }, transaction });
                if (!servicio) {
                    servicio = await TipoContratista.create({
                        nombre: item.servicio,
                        subgerencia_id: subgerencia.id,
                        descripcion: 'Sincronizado automáticamente desde Vinculación',
                        activo: 1
                    }, { transaction });
                }

                let dependencia = await Dependencia.findOne({ where: { nombre: item.dependencia }, transaction });
                if (!dependencia) {
                    dependencia = await Dependencia.create({ nombre: item.dependencia, activo: 1 }, { transaction });
                }

                let contratista = await Contratista.findOne({ where: { rut: item.rut_contratista }, transaction });
                if (!contratista) {
                    contratista = await Contratista.create({
                        rut: item.rut_contratista,
                        nombre: item.contratista || item.rut_contratista || 'Empresa Sincronizada',
                        activo: 1
                    }, { transaction });
                }

                const fallbackContrato = item.numero_contrato || `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}`;
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
                        numero_contrato: fallbackContrato,
                        fecha_inicio_contrato: item.fecha_inicio_contrato || new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        fecha_termino_contrato: item.fecha_termino_contrato || null
                    },
                    transaction
                });

                if (!created) {
                    const updateData = {};
                    if (item.numero_contrato && normalize(vinculacion.numero_contrato) !== normalize(item.numero_contrato)) {
                        updateData.numero_contrato = item.numero_contrato;
                    }
                    if (item.fecha_inicio_contrato && vinculacion.fecha_inicio_contrato !== item.fecha_inicio_contrato) updateData.fecha_inicio_contrato = item.fecha_inicio_contrato;
                    if (item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== item.fecha_termino_contrato) updateData.fecha_termino_contrato = item.fecha_termino_contrato;
                    else if (!item.fecha_termino_contrato && vinculacion.fecha_termino_contrato !== null) updateData.fecha_termino_contrato = null;

                    if (Object.keys(updateData).length > 0) {
                        await vinculacion.update(updateData, { transaction });
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
                        let gerencia = await Gerencia.findOne({ where: { nombre: asig.gerencia }, transaction });
                        if (!gerencia) {
                            gerencia = await Gerencia.create({ nombre: asig.gerencia, activo: 1 }, { transaction });
                        }

                        let subgerencia = await Subgerencia.findOne({ where: { nombre: asig.subgerencia, gerencia_id: gerencia.id }, transaction });
                        if (!subgerencia) {
                            subgerencia = await Subgerencia.create({ nombre: asig.subgerencia, gerencia_id: gerencia.id, activo: 1 }, { transaction });
                        }

                        let servicio = await TipoContratista.findOne({ where: { nombre: asig.servicio, subgerencia_id: subgerencia.id }, transaction });
                        if (!servicio) {
                            servicio = await TipoContratista.create({
                                nombre: asig.servicio,
                                subgerencia_id: subgerencia.id,
                                descripcion: 'Sincronizado desde Asignación Admin',
                                activo: 1
                            }, { transaction });
                        }

                        let dependencia = await Dependencia.findOne({ where: { nombre: asig.dependencia }, transaction });
                        if (!dependencia) {
                            dependencia = await Dependencia.create({ nombre: asig.dependencia, activo: 1 }, { transaction });
                        }

                        let contratista = await Contratista.findOne({ where: { rut: asig.rut_contratista }, transaction });
                        if (!contratista) {
                            contratista = await Contratista.create({
                                rut: asig.rut_contratista,
                                nombre: asig.rut_contratista,
                                activo: 1
                            }, { transaction });
                        }

                        const [vinculacion] = await Vinculacion.findOrCreate({
                            where: {
                                contratista_id: contratista.id,
                                servicio_id: servicio.id,
                                dependencia_id: dependencia.id,
                                subgerencia_id: subgerencia.id,
                                gerencia_id: gerencia.id
                            },
                            defaults: {
                                activo: 1,
                                numero_contrato: `CTR-SYN-${contratista.rut.replace(/[^0-9Kk]/g, '')}-${servicio.id}`
                            },
                            transaction
                        });

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

        await transaction.commit();
        res.json({ success: true, message: `Synced ${items.length} items.` });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in syncData:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
};

module.exports = { compareData, syncData };
