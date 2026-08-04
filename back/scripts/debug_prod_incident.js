// Script de diagnóstico de un solo uso, SOLO LECTURA (no escribe nada en la BD ni llama a
// OVAL con intención de sincronizar). Investiga el incidente de prod: 540 contratista_admin/
// administrador_contrato eliminados como "residuales" en la primera full-sync contra la API
// REAL de OVAL (ovalcontrol.com), todos con usu_id en el rango LOCAL (>=1.000.000) — señal de
// que resolveHomologatedUser nunca recibió un usu_id válido de OVAL para ellos.
//
// Corre esto en AMBOS entornos (prepro y prod) y compara la salida:
//   docker exec <contenedor> node scripts/debug_prod_incident.js
const axios = require('axios');
const { Op } = require('sequelize');
const { sequelize, User, ContratistaUsuario, Administracion, Registro, Compromiso, RegistroLog, Hallazgo } = require('../src/database/models');

const isProduction = process.env.NODE_ENV === 'production';
const defaultPizzaUrl = isProduction
    ? 'https://ovalcontrol.com/api/getContratistasAbastible'
    : 'https://prepro.ovalcontrol.com/api/getContratistasAbastible';
let EXTERNAL_API_URL = (process.env.PIZZA_API_URL || defaultPizzaUrl).trim().replace(/\r$/, '');
const API_KEY = process.env.PIZZA_API_KEY ? process.env.PIZZA_API_KEY.trim().replace(/\r$/, '') : undefined;
const ORIGIN = process.env.ORIGIN ? process.env.ORIGIN.trim().replace(/\r$/, '') : undefined;

const LOCAL_USU_ID_START = 1000000;

async function run() {
    console.log('=== ENTORNO ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('EXTERNAL_API_URL:', EXTERNAL_API_URL);

    // 1. Raw OVAL payload: ¿trae usu_id el contratista_admin / administrador_contrato?
    console.log('\n=== 1. FORMA CRUDA DE OVAL: contratista_admin / administrador_contrato ===');
    try {
        const response = await axios.get(EXTERNAL_API_URL, {
            headers: { 'api-key': API_KEY, 'Origin': ORIGIN },
            timeout: 30000
        });
        const contratistas = Array.isArray(response.data.contratistas) ? response.data.contratistas : [];
        console.log('Total contratistas en el payload:', contratistas.length);

        let sampleCA = null;
        let sampleADC = null;
        let countCAWithUsuId = 0, countCAWithoutUsuId = 0, totalCA = 0;
        let countADCWithUsuId = 0, countADCWithoutUsuId = 0, totalADC = 0;

        for (const c of contratistas) {
            const admins = c.contratista_admin || (c.data && c.data.contratista_admin) || [];
            for (const a of admins) {
                totalCA++;
                if (a && a.usu_id != null && a.usu_id !== '') countCAWithUsuId++; else countCAWithoutUsuId++;
                if (!sampleCA) sampleCA = a;
            }
            const asigs = c.asignaciones || (c.data && c.data.asignaciones) || [];
            for (const asig of asigs) {
                const admList = asig.administrador_contrato || asig.administradores_contrato || [];
                for (const adc of admList) {
                    totalADC++;
                    if (adc && adc.usu_id != null && adc.usu_id !== '') countADCWithUsuId++; else countADCWithoutUsuId++;
                    if (!sampleADC) sampleADC = adc;
                }
            }
        }

        console.log(`\ncontratista_admin: total=${totalCA} | CON usu_id=${countCAWithUsuId} | SIN usu_id=${countCAWithoutUsuId}`);
        console.log('Muestra cruda de un contratista_admin:', JSON.stringify(sampleCA));
        console.log(`\nadministrador_contrato: total=${totalADC} | CON usu_id=${countADCWithUsuId} | SIN usu_id=${countADCWithoutUsuId}`);
        console.log('Muestra cruda de un administrador_contrato:', JSON.stringify(sampleADC));
    } catch (apiErr) {
        console.error('Error consultando la API de OVAL:', apiErr.message);
    }

    // 2. Estado actual de la BD: cuántos contratista_admin/administrador_contrato hay,
    // y en qué rango de usu_id (local vs real de OVAL).
    console.log('\n=== 2. ESTADO ACTUAL DE LA BASE DE DATOS ===');
    const roles = ['contratista_admin', 'administrador_contrato'];
    for (const role of roles) {
        const users = await User.findAll({ where: { role }, attributes: ['usu_id', 'name', 'email', 'activo'] });
        const local = users.filter(u => Number(u.usu_id) >= LOCAL_USU_ID_START);
        const real = users.filter(u => Number(u.usu_id) < LOCAL_USU_ID_START);
        console.log(`\nRol ${role}: total=${users.length} | usu_id LOCAL (>=1.000.000)=${local.length} | usu_id real de OVAL=${real.length}`);
        if (real.length > 0) {
            console.log('  Ejemplos con usu_id real:', real.slice(0, 5).map(u => `${u.email} (usu_id=${u.usu_id})`).join(', '));
        }
    }

    // 3. Huérfanos: filas operativas que referencian un usu_id que ya no existe en users
    // (evidencia de que el borrado se llevó datos reales, no solo cuentas recién creadas).
    console.log('\n=== 3. DETECCIÓN DE HUÉRFANOS (evidencia de pérdida de datos reales) ===');
    const allUsuIds = new Set((await User.findAll({ attributes: ['usu_id'] })).map(u => Number(u.usu_id)));

    const registrosPorAuditor = await Registro.findAll({ attributes: ['auditado_por'], where: { auditado_por: { [Op.not]: null } } });
    const auditorIdsHuerfanos = [...new Set(registrosPorAuditor.map(r => Number(r.auditado_por)).filter(id => !allUsuIds.has(id)))];
    console.log('Registros con auditado_por que ya no existe en users:', auditorIdsHuerfanos.length, auditorIdsHuerfanos.slice(0, 10));

    const hallazgosPorAuditor = await Hallazgo.findAll({ attributes: ['auditor_id'], where: { auditor_id: { [Op.not]: null } } });
    const hallazgoAuditorHuerfanos = [...new Set(hallazgosPorAuditor.map(h => Number(h.auditor_id)).filter(id => !allUsuIds.has(id)))];
    console.log('Hallazgos con auditor_id que ya no existe en users:', hallazgoAuditorHuerfanos.length, hallazgoAuditorHuerfanos.slice(0, 10));

    const adminsHuerfanos = await Administracion.findAll({ attributes: ['administrador_contrato_id'] });
    const adcIdsHuerfanos = [...new Set(adminsHuerfanos.map(a => Number(a.administrador_contrato_id)).filter(id => !allUsuIds.has(id)))];
    console.log('Administraciones con administrador_contrato_id que ya no existe en users:', adcIdsHuerfanos.length, adcIdsHuerfanos.slice(0, 10));

    const cuHuerfanos = await ContratistaUsuario.findAll({ attributes: ['user_id'] });
    const cuIdsHuerfanos = [...new Set(cuHuerfanos.map(c => Number(c.user_id)).filter(id => !allUsuIds.has(id)))];
    console.log('ContratistaUsuario con user_id que ya no existe en users:', cuIdsHuerfanos.length, cuIdsHuerfanos.slice(0, 10));

    const compromisosHuerfanos = await Compromiso.findAll({ attributes: ['responsable_id', 'creado_por_id'] });
    const compResponsableHuerfanos = [...new Set(compromisosHuerfanos.map(c => Number(c.responsable_id)).filter(id => id && !allUsuIds.has(id)))];
    const compCreadoPorHuerfanos = [...new Set(compromisosHuerfanos.map(c => Number(c.creado_por_id)).filter(id => id && !allUsuIds.has(id)))];
    console.log('Compromisos con responsable_id huérfano:', compResponsableHuerfanos.length, compResponsableHuerfanos.slice(0, 10));
    console.log('Compromisos con creado_por_id huérfano:', compCreadoPorHuerfanos.length, compCreadoPorHuerfanos.slice(0, 10));

    const logsHuerfanos = await RegistroLog.findAll({ attributes: ['user_id'], where: { user_id: { [Op.not]: null } } });
    const logUserIdsHuerfanos = [...new Set(logsHuerfanos.map(l => Number(l.user_id)).filter(id => !allUsuIds.has(id)))];
    console.log('RegistroLog con user_id que ya no existe en users:', logUserIdsHuerfanos.length, logUserIdsHuerfanos.slice(0, 10));

    // 4. Esquema de tablas clave (para comparar prepro vs prod estructuralmente).
    console.log('\n=== 4. ESQUEMA DE TABLAS CLAVE (comparar contra el otro entorno) ===');
    const tablesToDump = ['users', 'contratista_usuarios', 'administraciones', 'vinculaciones', 'vinculacion_usuarios', 'password_reset_tokens'];
    for (const table of tablesToDump) {
        try {
            const [cols] = await sequelize.query(`SHOW COLUMNS FROM ${table}`);
            console.log(`\n-- ${table} (${cols.length} columnas) --`);
            cols.forEach(c => console.log(`  ${c.Field} | ${c.Type} | Null=${c.Null} | Key=${c.Key} | Default=${c.Default}`));
        } catch (schemaErr) {
            console.log(`\n-- ${table}: ERROR o no existe -> ${schemaErr.message}`);
        }
    }
}

run()
    .catch(err => console.error('Error:', err.message))
    .finally(() => process.exit());
