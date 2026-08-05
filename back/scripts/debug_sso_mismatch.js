// Script de diagnóstico de un solo uso, SOLO LECTURA (no escribe nada en la BD).
// Objetivo: reproducir exactamente la consulta de authController.loginExternal
// (User.findOne({ where: { usu_id, email } })) para un caso real de SSO que está
// devolviendo 401 "Usuario no registrado en el sistema" pese a que, a simple vista,
// el usu_id y el email coinciden con un usuario local existente.
//
// Uso:
//   node scripts/debug_sso_mismatch.js [usu_id] [email]
//   (por defecto usa los valores del token de ejemplo reportado: usu_id=1566,
//   email=cristian.salcedo@mafran.cl)
//
// Corre esto en el MISMO entorno donde ocurrió el fallo (prod/prepro):
//   docker exec <contenedor_api> node scripts/debug_sso_mismatch.js 1566 cristian.salcedo@mafran.cl
const { Op } = require('sequelize');
const { User } = require('../src/database/models');

const argUsuId = process.argv[2] || '1566';
const argEmail = process.argv[3] || 'cristian.salcedo@mafran.cl';

const charDump = (str) => {
    if (str === null || str === undefined) return '(null/undefined)';
    const s = String(str);
    return `"${s}" | length=${s.length} | charCodes=[${s.split('').map(c => c.charCodeAt(0)).join(',')}]`;
};

async function run() {
    console.log('=== ENTORNO ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('usu_id buscado:', argUsuId, '| email buscado:', argEmail);

    const ssoEmailNormalized = argEmail.toString().trim().toLowerCase();
    console.log('\nemail normalizado (igual al que aplica loginExternal antes de comparar):');
    console.log(' ', charDump(ssoEmailNormalized));

    console.log('\n=== 1. Búsqueda SOLO por usu_id ===');
    const byUsuId = await User.findOne({ where: { usu_id: argUsuId } });
    if (byUsuId) {
        console.log('Encontrado. Datos crudos relevantes:');
        console.log('  usu_id:', byUsuId.usu_id, '| id (legado):', byUsuId.id);
        console.log('  email en BD:', charDump(byUsuId.email));
        console.log('  role:', byUsuId.role, '| activo:', byUsuId.activo);
        console.log('  name:', byUsuId.name);
    } else {
        console.log('NINGÚN usuario local tiene ese usu_id.');
    }

    console.log('\n=== 2. Búsqueda SOLO por email (case-sensitive, tal cual llega) ===');
    const byEmailExact = await User.findOne({ where: { email: ssoEmailNormalized } });
    if (byEmailExact) {
        console.log('Encontrado. Datos crudos relevantes:');
        console.log('  usu_id:', byEmailExact.usu_id, '| id (legado):', byEmailExact.id);
        console.log('  email en BD:', charDump(byEmailExact.email));
        console.log('  role:', byEmailExact.role, '| activo:', byEmailExact.activo);
    } else {
        console.log('NINGÚN usuario local tiene ese email exacto (comparación tal cual la hace Sequelize/MySQL).');
    }

    console.log('\n=== 3. Búsqueda por email usando LOWER() explícito en SQL (tolerante a mayúsculas) ===');
    const { sequelize } = require('../src/database/models');
    const byEmailLower = await User.findOne({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), ssoEmailNormalized)
    });
    if (byEmailLower) {
        console.log('Encontrado con LOWER(). Datos crudos relevantes:');
        console.log('  usu_id:', byEmailLower.usu_id, '| email en BD:', charDump(byEmailLower.email));
    } else {
        console.log('Tampoco se encontró usando LOWER(email) = email_normalizado.');
    }

    console.log('\n=== 4. Consulta EXACTA que ejecuta loginExternal hoy (AND usu_id + email) ===');
    const strictMatch = await User.findOne({ where: { usu_id: argUsuId, email: ssoEmailNormalized } });
    console.log('Resultado:', strictMatch ? `MATCH (usu_id=${strictMatch.usu_id}, email=${strictMatch.email})` : 'SIN MATCH -> esto es lo que está causando el 401');

    console.log('\n=== 5. Diagnóstico ===');
    if (!byUsuId && !byEmailExact && !byEmailLower) {
        console.log('-> No existe NINGÚN usuario local con ese usu_id ni con ese email. El usuario realmente no está sincronizado localmente.');
    } else if (byUsuId && !byEmailExact && !byEmailLower) {
        console.log('-> Existe un usuario con ese usu_id, pero su email en BD es DISTINTO al que envía el token/OVAL:');
        console.log('   Email en BD:      ', charDump(byUsuId.email));
        console.log('   Email en token:   ', charDump(ssoEmailNormalized));
    } else if (!byUsuId && (byEmailExact || byEmailLower)) {
        const match = byEmailExact || byEmailLower;
        console.log('-> Existe un usuario con ese email, pero su usu_id en BD es DISTINTO al que envía el token/OVAL:');
        console.log('   usu_id en BD:   ', match.usu_id);
        console.log('   usu_id en token:', argUsuId);
    } else if (byUsuId && (byEmailExact || byEmailLower) && byUsuId.usu_id !== (byEmailExact || byEmailLower).usu_id) {
        console.log('-> El usu_id y el email pertenecen a DOS usuarios locales DISTINTOS (identidad dividida en 2 filas):');
        console.log('   Fila por usu_id:', byUsuId.usu_id, byUsuId.email);
        console.log('   Fila por email: ', (byEmailExact || byEmailLower).usu_id, (byEmailExact || byEmailLower).email);
    } else if (strictMatch && !strictMatch.activo) {
        console.log('-> El usuario coincide en usu_id+email pero está INACTIVO (activo=0). El login SSO lo rechazaría igual con "Usuario desactivado" en el siguiente paso.');
    } else if (strictMatch) {
        console.log('-> El match SÍ funciona con estos datos exactos. Si en producción sigue fallando, el email/usu_id que realmente llega desde la respuesta de OVAL (pizzaResponse.data.user) es distinto al que se está probando aquí -- revisar el log "[SSO API RESPONSE] <- ... Datos de Respuesta:" del intento real.');
    }
}

run()
    .catch(err => console.error('Error:', err.message))
    .finally(() => process.exit());
