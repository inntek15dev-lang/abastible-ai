// IEEE Trace: SPRINT 5 | Seeders | Consolidación Faenas ASEM
const { Gerencia, Subgerencia, Dependencia } = require('../models');

const data = {
  "gerencias": [
    "OPERACIONES",
    "SOLUCIONES ENERGETICAS",
    "ADMINISTRACION Y FINANZAS",
    "LOGISTICA",
    "PERSONAS",
    "RIESGOS OPERACIONALES",
    "COMERCIAL CLIENTE HOGAR",
    "VENTAS GRANEL",
    "DISTRIBUIDORES"
  ],
  "subgerencias": {
    "OPERACIONES": [
      "MANTENIMIENTO",
      "GERENCIA DE EXCELENCIA OPERACIONAL",
      "LOGISTICA",
      "PRODUCCION",
      "GESTIÓN DE ENVASES",
      "PROYECTO E INSTALACIONES",
      "VENTAS ZONA SUR"
    ],
    "SOLUCIONES ENERGETICAS": [
      "SOLUCIONES ENERGÉTICAS",
      "PROYECTO E INSTALACIONES",
      "ABASTECIMIENTO",
      "MEDIDORES",
      "MANTENIMIENTO",
      "VENTAS INSTITUCIONALES"
    ],
    "ADMINISTRACION Y FINANZAS": [
      "TECNOLOGIA DE LA INFORMACIÓN",
      "SERVICIOS EXTERNOS Y SEGURIDAD",
      "SERVICIOS FINANCIEROS",
      "PROCUREMENT",
      "VENTAS ZONA SUR"
    ],
    "LOGISTICA": [
      "LOGISTICA"
    ],
    "PERSONAS": [
      "SERVICIOS EXTERNOS Y SEGURIDAD",
      "PERSONAS"
    ],
    "RIESGOS OPERACIONALES": [
      "CALIDAD Y MEDIO AMBIENTE",
      "SERVICIOS EXTERNOS Y SEGURIDAD",
      "EMERGENCIAS Y MANTENIMIENTO DE INSTALACIONES",
      "INTEGRIDAD OPERACIONAL",
      "RIESGOS OPERACIONALES"
    ],
    "COMERCIAL CLIENTE HOGAR": [
      "EXPERIENCIA AL CLIENTE",
      "VENTAS ZONA CENTRO NORTE",
      "SERVICIOS GENERALES",
      "VENTAS ZONA NORTE",
      "VENTAS ZONA SUR",
      "PROYECTO E INSTALACIONES",
      "MARKETING"
    ],
    "VENTAS GRANEL": [
      "ABASTECIMIENTO",
      "PROYECTO E INSTALACIONES",
      "VENTAS ZONA CENTRO NORTE"
    ],
    "DISTRIBUIDORES": [
      "VENTAS INSTITUCIONALES"
    ]
  },
  "dependencias": {
    "MANTENIMIENTO": [
      "TRANSVERSAL NACIONAL",
      "PLANTA MAIPÚ",
      "EP ZONA SUR",
      "MANTENCIÓN GRANEL",
      "PLANTA TALCA",
      "PLANTA LENGA",
      "EP NIVEL NACIONAL",
      "EP ZONA CENTRO",
      "PLANTA CONCON"
    ],
    "SOLUCIONES ENERGÉTICAS": [
      "TRANSVERSAL NACIONAL",
      "SOLUCIONES ENERGÉTICAS",
      "EP NIVEL NACIONAL",
      "INSTALACIONES NACIONAL",
      "SERVICIOS TRANSITORIOS",
      "INSTALACIONES ZONA CENTRO"
    ],
    "PROYECTO E INSTALACIONES": [
      "INSTALACIONES ZONA SUR",
      "INSTALACIONES ZONA CENTRO",
      "INSTALACIONES ZONA AUSTRAL",
      "INSTALACIONES ZONA CENTRO NORTE",
      "PLANTA IQUIQUE",
      "INSTALACIONES PUERTO MONTT",
      "INSTALACIONES ZONA NORTE",
      "INSTALACIONES NACIONAL",
      "PLANTA CONCON",
      "EP ZONA NORTE",
      "PSR Monte Patria",
      "PSR La estrella",
      "TRANSVERSAL NACIONAL",
      "PLANTA EL PENON",
      "OFICINA SAN FERNANDO",
      "PLANTA ANTOFAGASTA",
      "OFICINA COPIAPO"
    ],
    "TECNOLOGIA DE LA INFORMACIÓN": [
      "SERVICIOS GENERALES CENTRAL",
      "INSTALACIONES ZONA CENTRO",
      "TRANSVERSAL NACIONAL"
    ],
    "LOGISTICA": [
      "PLANTA TALCA",
      "OFICINA CHILLAN",
      "OFICINA DISTRIBUCIÓN LENGA",
      "OFICINA TEMUCO",
      "OFICINA VILLARRICA",
      "OFICINA DISTRIBUCIÓN MAIPÚ",
      "OFICINA DISTRIBUCIÓN OSORNO",
      "PLANTA COYAHIQUE",
      "OFICINA LOS ANGELES",
      "PLANTA LENGA",
      "PLANTA OSORNO",
      "OFICINA VALDIVIA",
      "EP NIVEL NACIONAL",
      "EP ZONA SUR",
      "OFICINA SAN FERNANDO",
      "PLANTA ARICA",
      "PLANTA ANTOFAGASTA",
      "OFICINA PUERTO MONTT",
      "OFICINA COPIAPO",
      "PLANTA EL PEÑON",
      "OF.DISTR.CONCON",
      "OFICINA LINARES",
      "PLANTA IQUIQUE",
      "PLANTA CONCON",
      "OFICINA CURICO",
      "PLANTA MAIPÚ",
      "OFICINA CASTRO",
      "SERVICIOS GENERALES CENTRAL"
    ],
    "GERENCIA DE EXCELENCIA OPERACIONAL": [
      "PLANTA MAIPÚ",
      "CENTRO LOGÍSTICO MAIPÚ",
      "EP ZONA CENTRO",
      "OBRAS DE INGENIERÍA",
      "TRANSVERSAL NACIONAL",
      "EP NIVEL NACIONAL",
      "PLANTA TALCA",
      "PLANTA CONCON",
      "PLANTA ARICA",
      "OFICINA PUERTO MONTT",
      "OFICINA TEMUCO"
    ],
    "SERVICIOS EXTERNOS Y SEGURIDAD": [
      "SERVICIOS GENERALES CENTRAL",
      "PLANTA LENGA",
      "PLANTA MAIPÚ",
      "PLANTA ARICA",
      "PLANTA IQUIQUE",
      "PLANTA ANTOFAGASTA",
      "OFICINA COPIAPO",
      "OFICINA LA SERENA",
      "PLANTA CONCON",
      "ESTACION RECARGA PUDAHUEL",
      "OFICINA SAN FERNANDO",
      "EMALCO SAN FERNANDO",
      "OFICINA CURICO",
      "PLANTA TALCA",
      "OFICINA LINARES",
      "OFICINA CHILLAN",
      "SUB.GCIA. ZONA SUR",
      "OFICINA LOS ANGELES",
      "LOCAL VENTAS TEMUCO",
      "OFICINA TEMUCO",
      "OFICINA VILLARRICA",
      "OFICINA VALDIVIA",
      "PLANTA OSORNO",
      "OFICINA PUERTO MONTT",
      "PLANTA COYAHIQUE",
      "OFICINA CASTRO",
      "PLANTA EL PENON",
      "TRANSVERSAL NACIONAL",
      "OFICINA VENTAS GAS ENVASADO VALDIVIA",
      "EP NIVEL NACIONAL",
      "CENTRO LOGÍSTICO MAIPÚ",
      "OFICINA PUNTA ARENAS"
    ],
    "SERVICIOS FINANCIEROS": [
      "SERVICIOS GENERALES CENTRAL"
    ],
    "PRODUCCION": [
      "PLANTA MAIPÚ",
      "EMALCO SAN FERNANDO",
      "PLANTA TALCA",
      "OFICINA LINARES",
      "PLANTA LENGA",
      "PLANTA EL PENON",
      "PLANTA OSORNO",
      "OFICINA PUERTO MONTT",
      "PLANTA CONCON",
      "OFICINA VILLARRICA",
      "OFICINA CASTRO",
      "MANTENCIÓN ENVASES MAIPÚ",
      "OFICINA CHILLAN",
      "EP ZONA NORTE",
      "TRANSVERSAL NACIONAL",
      "OFICINA COPIAPO",
      "EP ZONA SUR",
      "OFICINA DISTRIBUCIÓN OSORNO",
      "OFICINA TEMUCO",
      "OFICINA CURICO",
      "PLANTA ANTOFAGASTA",
      "PLANTA COYAHIQUE",
      "PLANTA IQUIQUE",
      "OFICINA LOS ANGELES",
      "OFICINA VALDIVIA"
    ],
    "CALIDAD Y MEDIO AMBIENTE": [
      "PLANTA TALCA",
      "PLANTA EL PENON",
      "PLANTA CONCON",
      "PLANTA OSORNO",
      "PLANTA COYAHIQUE",
      "PLANTA MAIPÚ",
      "PLANTA ARICA",
      "EP NIVEL NACIONAL",
      "TRANSVERSAL NACIONAL"
    ],
    "EXPERIENCIA AL CLIENTE": [
      "CALL CENTER"
    ],
    "GESTIÓN DE ENVASES": [
      "CENTRO LOGÍSTICO MAIPÚ",
      "TRANSVERSAL NACIONAL",
      "MANTENCIÓN ENVASES MAIPÚ",
      "EP ZONA CENTRO",
      "PLANTA LENGA"
    ],
    "EMERGENCIAS Y MANTENIMIENTO DE INSTALACIONES": [
      "CENTRO LOGÍSTICO MAIPÚ",
      "PLANTA ANTOFAGASTA"
    ],
    "INTEGRIDAD OPERACIONAL": [
      "EP NIVEL NACIONAL",
      "SERVICIOS GENERALES CENTRAL",
      "TRANSVERSAL NACIONAL",
      "PLANTA MAIPÚ",
      "PLANTA LENGA"
    ],
    "ABASTECIMIENTO": [
      "INSTALACIONES PUERTO MONTT",
      "INSTALACIONES ZONA NORTE",
      "PSR LA ESTRELLA"
    ],
    "VENTAS ZONA CENTRO NORTE": [
      "OFICINA VENTAS LAMPA",
      "INSTALACIONES ZONA CENTRO",
      "TRANSVERSAL NACIONAL",
      "CONSIGNATARIO CALAMA",
      "CONSIGNATARIO VALPARAÍSO"
    ],
    "PROCUREMENT": [
      "CENTRO LOGÍSTICO MAIPÚ"
    ],
    "MEDIDORES": [
      "SERVICIOS MEDIDORES"
    ],
    "VENTAS ZONA SUR": [
      "PLANTA ARICA",
      "INSTALACIONES ZONA SUR",
      "TRANSVERSAL NACIONAL"
    ],
    "RIESGOS OPERACIONALES": [
      "TRANSVERSAL NACIONAL"
    ],
    "VENTAS INSTITUCIONALES": [
      "CENTRO LOGÍSTICO MAIPÚ",
      "PLANTA EL PENON"
    ],
    "SERVICIOS GENERALES": [
      "TRANSVERSAL NACIONAL"
    ],
    "VENTAS ZONA NORTE": [
      "CONSIGNATARIO CALAMA"
    ],
    "MARKETING": [
      "INSTALACIONES ZONA CENTRO NORTE"
    ],
    "PERSONAS": [
      "PLANTA MAIPÚ"
    ]
  }
};

async function seedAsemFaenas() {
    console.log('--- Iniciando Seeder Consolidado de Faenas ASEM ---');
    try {
        for (const gName of data.gerencias) {
            const [gerencia] = await Gerencia.findOrCreate({
                where: { nombre: gName },
                defaults: { activo: 1 }
            });
            console.log(`✅ Gerencia: ${gerencia.nombre}`);

            const subgs = data.subgerencias[gName] || [];
            for (const sName of subgs) {
                const [subgerencia] = await Subgerencia.findOrCreate({
                    where: { nombre: sName, gerencia_id: gerencia.id },
                    defaults: { activo: 1 }
                });
                console.log(`   🔸 Subgerencia: ${subgerencia.nombre}`);

                const deps = data.dependencias[sName] || [];
                for (const dName of deps) {
                    const [dependencia] = await Dependencia.findOrCreate({
                        where: { nombre: dName, subgerencia_id: subgerencia.id },
                        defaults: { activo: 1 }
                    });
                    console.log(`      🔹 Dependencia: ${dependencia.nombre}`);
                }
            }
        }
        console.log('--- Seeder ASEM finalizado con éxito ---');
    } catch (error) {
        console.error('❌ Error ejecutando el seeder ASEM:', error);
    }
}

if (require.main === module) {
    seedAsemFaenas().then(() => process.exit(0));
}

module.exports = seedAsemFaenas;
