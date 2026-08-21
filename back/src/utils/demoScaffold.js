// Identidad de la empresa/contrato demo del sistema — completamente sintética a
// propósito, para que JAMÁS pueda coincidir con una empresa o contrato real de OVAL
// (a diferencia de "Mafran", que resultó ser una empresa real de OVAL: usarla como ancla
// demo la dejaba expuesta a que el espejo de OVAL le pisara el nombre/vinculaciones, o a
// que la poda de residuales la borrara si OVAL alguna vez deja de reportarla).
//
// Fuente única de verdad: usado tanto por la poda de residuales en syncController.js
// (para excluir este scaffold de la homologación con OVAL) como por
// scripts/seed_demo_users.js / scripts/remove_demo_users.js (para crearlo/eliminarlo).
const DEMO_CONTRATISTA_RUT = '88888888-8';
const DEMO_CONTRATISTA_NOMBRE = 'EMPRESA DEMO SPA';
const DEMO_GERENCIA = 'GERENCIA DEMO';
const DEMO_SUBGERENCIA = 'SUBGERENCIA DEMO';
const DEMO_SERVICIO = 'SERVICIO DEMO';
const DEMO_DEPENDENCIA = 'DEPENDENCIA DEMO';
const DEMO_NUMERO_CONTRATO = 'DEMO-1';

// Segunda vinculación demo para pruebas de N-vinculaciones
const DEMO_SERVICIO_2 = 'SERVICIO DEMO 2';
const DEMO_DEPENDENCIA_2 = 'DEPENDENCIA DEMO 2';
const DEMO_NUMERO_CONTRATO_2 = 'DEMO-2';

module.exports = {
    DEMO_CONTRATISTA_RUT,
    DEMO_CONTRATISTA_NOMBRE,
    DEMO_GERENCIA,
    DEMO_SUBGERENCIA,
    DEMO_SERVICIO,
    DEMO_DEPENDENCIA,
    DEMO_NUMERO_CONTRATO,
    DEMO_SERVICIO_2,
    DEMO_DEPENDENCIA_2,
    DEMO_NUMERO_CONTRATO_2
};
