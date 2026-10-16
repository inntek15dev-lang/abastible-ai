// IEEE Trace: REQ-002 | Periodicidad y Ventanas de Cumplimiento (PARKO)
const { Op } = require('sequelize');
const { Registro, RegistroActividad, Actividad, Evidencia } = require('../database/models');

/**
 * Normaliza y calcula la ventana de tiempo según la periodicidad
 * - anual: año calendario completo (01 al 12)
 * - semestral: S1 (meses 01 al 06), S2 (meses 07 al 12)
 * - trimestral: T1 (01-03), T2 (04-06), T3 (07-09), T4 (10-12)
 * - mensual: mes calendario
 */
function getPeriodoWindow(periodo, frecuencia) {
    if (!periodo) return null;
    const pStr = typeof periodo === 'string' ? periodo : (periodo.toISOString ? periodo.toISOString().substring(0, 10) : String(periodo));
    const year = parseInt(pStr.substring(0, 4), 10);
    const month = parseInt(pStr.substring(5, 7), 10);
    const freq = (frecuencia || 'mensual').toLowerCase();

    const pad = n => String(n).padStart(2, '0');

    if (freq === 'anual') {
        const meses = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
        return {
            tipo: 'anual',
            windowId: `${year}`,
            label: `Año ${year}`,
            badge: `Anual ${year}`,
            fechaInicio: `${year}-01-01`,
            fechaFin: `${year}-12-31`,
            meses,
            year,
            periodNumber: 1
        };
    }

    if (freq === 'semestral') {
        const isS1 = month <= 6;
        const startM = isS1 ? 1 : 7;
        const endM = isS1 ? 6 : 12;
        const meses = Array.from({ length: 6 }, (_, i) => `${year}-${pad(startM + i)}`);
        return {
            tipo: 'semestral',
            windowId: `${year}-${isS1 ? 'S1' : 'S2'}`,
            label: isS1 ? `Semestre 1 (Ene - Jun), ${year}` : `Semestre 2 (Jul - Dic), ${year}`,
            badge: isS1 ? `Semestre 1 (${year})` : `Semestre 2 (${year})`,
            fechaInicio: `${year}-${pad(startM)}-01`,
            fechaFin: isS1 ? `${year}-06-30` : `${year}-12-31`,
            meses,
            year,
            periodNumber: isS1 ? 1 : 2
        };
    }

    if (freq === 'trimestral') {
        const q = Math.ceil(month / 3); // 1, 2, 3, 4
        const startM = (q - 1) * 3 + 1;
        const endM = q * 3;
        const endDays = [31, 30, 30, 31];
        const meses = Array.from({ length: 3 }, (_, i) => `${year}-${pad(startM + i)}`);
        const qNames = ['Ene - Mar', 'Abr - Jun', 'Jul - Sep', 'Oct - Dic'];
        return {
            tipo: 'trimestral',
            windowId: `${year}-T${q}`,
            label: `Trimestre ${q} (${qNames[q - 1]}), ${year}`,
            badge: `Trimestre ${q} (${year})`,
            fechaInicio: `${year}-${pad(startM)}-01`,
            fechaFin: `${year}-${pad(endM)}-${endDays[q - 1]}`,
            meses,
            year,
            periodNumber: q
        };
    }

    // Default: mensual
    const lastDay = new Date(year, month, 0).getDate();
    return {
        tipo: 'mensual',
        windowId: `${year}-${pad(month)}`,
        label: `Mes ${pad(month)}, ${year}`,
        badge: `Mensual`,
        fechaInicio: `${year}-${pad(month)}-01`,
        fechaFin: `${year}-${pad(month)}-${pad(lastDay)}`,
        meses: [`${year}-${pad(month)}`],
        year,
        periodNumber: month
    };
}

/**
 * Busca todos los registros anteriores del mismo contratista_asignacion_id en el año calendario
 * y construye un mapa de actividades ya cumplidas / cargadas con evidencias.
 */
async function obtenerCumplimientosPreviosEnAno(contratistaAsignacionId, year, upToPeriodo, excludeRegistroId = null) {
    if (!contratistaAsignacionId || !year || !upToPeriodo) return [];

    const startYearStr = `${year}-01-01`;
    const upToStr = typeof upToPeriodo === 'string' ? upToPeriodo.substring(0, 7) + '-01' : upToPeriodo;

    const whereReg = {
        contratista_asignacion_id: contratistaAsignacionId,
        periodo: {
            [Op.gte]: startYearStr,
            [Op.lte]: upToStr
        }
    };

    if (excludeRegistroId) {
        whereReg.id = { [Op.ne]: excludeRegistroId };
    }

    const registros = await Registro.findAll({
        where: whereReg,
        include: [
            {
                model: RegistroActividad,
                as: 'actividades',
                include: [
                    {
                        model: Evidencia,
                        as: 'evidencias',
                        attributes: ['id', 'ruta', 'nombre_archivo', 'nombre_original', 'created_at']
                    },
                    {
                        model: Actividad,
                        as: 'actividad',
                        attributes: ['id', 'codigo', 'descripcion', 'frecuencia', 'requiere_evidencia']
                    }
                ]
            }
        ],
        order: [['periodo', 'ASC']]
    });

    return registros;
}

/**
 * Resuelve la periodicidad para una lista de actividades o para un registro completo
 */
async function resolverPeriodicidadActividades({ actividades, periodo, contratistaAsignacionId, currentRegistroId = null, persistDb = false }) {
    if (!actividades || actividades.length === 0 || !periodo || !contratistaAsignacionId) {
        return actividades;
    }

    const pStr = typeof periodo === 'string' ? periodo : periodo.toISOString().substring(0, 10);
    const year = parseInt(pStr.substring(0, 4), 10);

    // Obtener todos los registros del año calendario previo o hasta el periodo actual
    const registrosAno = await obtenerCumplimientosPreviosEnAno(contratistaAsignacionId, year, pStr, currentRegistroId);

    for (const act of actividades) {
        const baseAct = act.actividad || act;
        const frecuencia = (baseAct.frecuencia || 'mensual').toLowerCase();
        const window = getPeriodoWindow(pStr, frecuencia);

        // Atributos informativos para el cliente
        act.frecuencia = frecuencia;
        act.frecuencia_window = window.windowId;
        act.frecuencia_label = window.label;
        act.frecuencia_badge = window.badge;

        if (frecuencia === 'mensual') {
            continue;
        }

        // Si es trimestral, semestral o anual:
        // Verificar si la actividad YA tiene evidencia cargada o cumple en este mismo registro
        const tieneEvidenciaActual = (act.evidencias && act.evidencias.length > 0);
        const cumpleActual = (act.cumple === 1 || act.cumple === true || act.cumple === '1');

        if (tieneEvidenciaActual || cumpleActual) {
            act.cumplido_en_periodo_actual = true;
            // Si ya se cargó en este periodo, queda marcado
            continue;
        }

        // Si no se ha cargado en el registro actual, buscar en la ventana correspondiente
        // de registros anteriores dentro del mismo año
        const fechaInicioVentana = window.fechaInicio;

        let matchPrevio = null;
        let matchRegistro = null;

        for (const reg of registrosAno) {
            const regPeriodo = String(reg.periodo).substring(0, 10);
            if (regPeriodo >= fechaInicioVentana && regPeriodo <= pStr) {
                const foundRA = (reg.actividades || []).find(ra => Number(ra.actividad_id) === Number(baseAct.id || act.actividad_id));
                if (foundRA) {
                    const hasEv = foundRA.evidencias && foundRA.evidencias.length > 0;
                    const isCumple = foundRA.cumple === 1 || foundRA.cumple === true || foundRA.cumple_auditor === 1 || foundRA.cumple_auditor === true;
                    if (hasEv || isCumple) {
                        matchPrevio = foundRA;
                        matchRegistro = reg;
                        break;
                    }
                }
            }
        }

        if (matchPrevio && matchRegistro) {
            const periodoOrigenStr = String(matchRegistro.periodo).substring(0, 7);

            // Mantener como CUMPLIDO hasta el siguiente periodo
            act.cumple = 1;
            if (act.cumple_auditor === null || act.cumple_auditor === undefined) {
                act.cumple_auditor = matchPrevio.cumple_auditor === 1 ? 1 : 1;
            }

            act.cumplido_periodo_anterior = true;
            act.periodo_origen = periodoOrigenStr;
            act.registro_origen_id = matchRegistro.id;

            // Asociar evidencias heredadas con tag explicito para que el frontend y auditor puedan visualizarlas
            const evidenciasHeredadas = (matchPrevio.evidencias || []).map(ev => {
                const plain = ev.toJSON ? ev.toJSON() : { ...ev };
                return {
                    ...plain,
                    heredada: true,
                    periodo_origen: periodoOrigenStr,
                    registro_origen_id: matchRegistro.id
                };
            });

            if (!act.evidencias || act.evidencias.length === 0) {
                act.evidencias = evidenciasHeredadas;
                if (act.dataValues) {
                    act.dataValues.evidencias = evidenciasHeredadas;
                }
            }

            // Si se solicita persistir en DB y es un modelo Sequelize
            if (persistDb && act.id && act.update) {
                const updateFields = {};
                if (act.cumple !== 1) updateFields.cumple = 1;
                if (act.cumple_auditor === null && matchPrevio.cumple_auditor === 1) {
                    updateFields.cumple_auditor = 1;
                }
                if (Object.keys(updateFields).length > 0) {
                    await act.update(updateFields);
                }
            }
        }
    }

    return actividades;
}

/**
 * Resuelve y sincroniza las actividades de un registro existente
 */
async function resolverPeriodicidadRegistro(registro, persistDb = true) {
    if (!registro) return null;

    const actividades = registro.actividades || [];
    const periodo = registro.periodo;
    const contratistaAsignacionId = registro.contratista_asignacion_id;

    if (actividades.length > 0 && periodo && contratistaAsignacionId) {
        await resolverPeriodicidadActividades({
            actividades,
            periodo,
            contratistaAsignacionId,
            currentRegistroId: registro.id,
            persistDb
        });
    }

    return registro;
}

/**
 * Valida si faltan evidencias obligatorias, considerando la ventana de periodicidad.
 * Si una actividad trimestral/semestral/anual ya fue cargada con evidencia en un mes anterior
 * dentro de la misma ventana, se considera VÁLIDA y no bloquea.
 */
async function validarEvidenciasRequeridas(registroId, isAuditor = false) {
    const registro = await Registro.findByPk(registroId, {
        include: [
            {
                model: RegistroActividad,
                as: 'actividades',
                include: [
                    { model: Actividad, as: 'actividad' },
                    { model: Evidencia, as: 'evidencias' }
                ]
            }
        ]
    });

    if (!registro) {
        return { valid: false, message: 'Registro no encontrado', faltantes: [] };
    }

    // Resolver periodicidad para que herede estado y evidencias previas
    await resolverPeriodicidadRegistro(registro, false);

    const actividades = registro.actividades || [];

    const actividadesRequeridas = actividades.filter(a => {
        const isCumple = isAuditor
            ? (a.cumple_auditor === true || a.cumple_auditor === 1)
            : (a.cumple === true || a.cumple === 1);
        return isCumple && a.actividad?.requiere_evidencia;
    });

    const faltantes = [];

    for (const a of actividadesRequeridas) {
        const hasDirectEv = a.evidencias && a.evidencias.length > 0;
        if (!hasDirectEv) {
            faltantes.push({
                id: a.id,
                actividad_id: a.actividad_id,
                codigo: a.actividad?.codigo,
                descripcion: a.actividad?.descripcion,
                frecuencia: a.actividad?.frecuencia
            });
        }
    }

    const codigos = faltantes.map(f => f.codigo).join(', ');
    return {
        valid: faltantes.length === 0,
        faltantes,
        codigos
    };
}

/**
 * Calcula porcentajes de cumplimiento del contratista y del auditor
 */
function calcularPorcentajes(actividades) {
    if (!actividades || actividades.length === 0) {
        return { porcentaje: 0, porcentajeAuditor: null };
    }

    // Contratista: excluye N/A (2)
    const applicable = actividades.filter(a => a.cumple !== 2 && a.cumple !== '2');
    const cumplidas = applicable.filter(a => a.cumple === 1 || a.cumple === true || a.cumple === '1').length;
    const porcentaje = applicable.length > 0 ? (cumplidas / applicable.length) * 100 : 0;

    // Auditor: excluye no auditados (null) y N/A (2)
    const auditables = actividades.filter(a => a.cumple_auditor !== null && a.cumple_auditor !== 2 && a.cumple_auditor !== '2');
    const cumplidasAuditor = auditables.filter(a => a.cumple_auditor === 1 || a.cumple_auditor === true || a.cumple_auditor === '1').length;
    const porcentajeAuditor = auditables.length > 0 ? (cumplidasAuditor / auditables.length) * 100 : null;

    return {
        porcentaje: Number(porcentaje.toFixed(2)),
        porcentajeAuditor: porcentajeAuditor !== null ? Number(porcentajeAuditor.toFixed(2)) : null
    };
}

/**
 * Recalcula y guarda los porcentajes de un registro en la base de datos
 */
async function recalcularYGuardarPorcentajes(registroId) {
    const registro = await Registro.findByPk(registroId, {
        include: [
            {
                model: RegistroActividad,
                as: 'actividades',
                include: [
                    { model: Actividad, as: 'actividad' },
                    { model: Evidencia, as: 'evidencias' }
                ]
            }
        ]
    });

    if (!registro) return null;

    await resolverPeriodicidadRegistro(registro, true);

    const { porcentaje, porcentajeAuditor } = calcularPorcentajes(registro.actividades);

    const updateData = { porcentaje_cumplimiento: porcentaje };
    if (porcentajeAuditor !== null) {
        updateData.porcentaje_cumplimiento_auditor = porcentajeAuditor;
    }

    await registro.update(updateData);
    return { registro, porcentaje, porcentajeAuditor };
}

module.exports = {
    getPeriodoWindow,
    obtenerCumplimientosPreviosEnAno,
    resolverPeriodicidadActividades,
    resolverPeriodicidadRegistro,
    validarEvidenciasRequeridas,
    calcularPorcentajes,
    recalcularYGuardarPorcentajes
};
