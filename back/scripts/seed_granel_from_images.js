require('dotenv').config({ path: '../.env' });
const { Sequelize, DataTypes } = require('sequelize');
const DB_CONFIG = require('../src/config/database.js');

const sequelize = new Sequelize(DB_CONFIG.database, DB_CONFIG.username, DB_CONFIG.password, {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: DB_CONFIG.dialect,
    logging: console.log
});

const Programa = sequelize.define('Programa', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    meta_cumplimiento: { type: DataTypes.INTEGER, defaultValue: 100 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'programas', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Elemento = sequelize.define('Elemento', {
    programa_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    numero: { type: DataTypes.STRING, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    descripcion: { type: DataTypes.TEXT }
}, { tableName: 'elementos', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Actividad = sequelize.define('Actividad', {
    elemento_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    codigo: { type: DataTypes.STRING, allowNull: false },
    actividad: { type: DataTypes.TEXT, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    criterios: { type: DataTypes.TEXT },
    frecuencia: { type: DataTypes.ENUM('mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique'), defaultValue: 'mensual' },
    requiere_evidencia: { type: DataTypes.BOOLEAN, defaultValue: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    template_url: { type: DataTypes.STRING } // Store evidence description here for reference or future use
}, { tableName: 'actividades', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const GRANEL_DATA = [
    {
        item: "1",
        nombre: "ELEMENTO 1: Liderazgo y compromiso",
        actividades: [
            {
                codigo: "1.1",
                actividad: "E-1. Ejecución del Programa SAFEALIGN",
                descripcion: "Todo contacto de seguridad deberá ser planificado, según las directrices de programa safealign, y esta planificación tendrá su foco en los análisis de tendencia de accidentes. Se deberá realizar los CS, SST e IRF acorde a las metas establecidas en el programa Safealign, y de acuerdo al numero de personas que deban reportar.\nContactos de Seguridad (CS): 2 CS por cada jefatura o linea de supervisión que se hayan asignado.\nSesiones de Seguridad en el trabajo (SST): 2 SST por cada jefatura o linea de supervisión que se hayan asignado.\nInspección de Riesgos Físicos (IRF): 2 IRF por cada jefatura o linea de supervisión que se hayan asignado.",
                frecuencia: "mensual",
                evidencia: "Registro +Seguridad"
            },
            {
                codigo: "1.2",
                actividad: "E-1 Participación en CPHS de faena",
                descripcion: "La actividad corresponde a la participación activa en las reuniones y comisiones del CPHS de faena en las dependencias en las que aplique, debe existir evidencia objetiva de su participación en la reunión del mes informado, específicamente un registro de asistencia junto con el acta respectiva.",
                frecuencia: "mensual",
                evidencia: "Registro de asistencia, junto con acta respectiva."
            },
            {
                codigo: "1.3",
                actividad: "E-1 Reunión de accountability",
                descripcion: "La actividad corresponde a la presentación de resultados correspondientes al programa +seguridad contratistas al administrador de contrato Abastible y Equipo de Integridad Operacional. La presentación se deberá realizar bajo el formato establecido por Abastible.",
                frecuencia: "mensual",
                evidencia: "Registro de Asistencia"
            }
        ]
    },
    {
        item: "2",
        nombre: "ELEMENTO 2: Evaluación del riesgo y Gestión del riesgo",
        actividades: [
            {
                codigo: "2.1",
                actividad: "E-2 Realizar un analisis de riesgos cualitativo (AST) de una tarea crítica",
                descripcion: "Realizar una sesión de seguridad, desarrollando un análisis de riesgos cualitativo (AST) de una tarea que se desprenda de la matriz de riesgos del procesos, generada por Abastible. El análisis debe ser compartido mediante una sesión de seguridad con el personal del segmento al cual pertenezca. Esta actividad se dará por realizada cuando exista un análisis de riesgos (AST) y esta información se encuentre difundida al personal mediante una sesión de seguridad, por tanto, el criterio de cumplimiento considera 02 documentos: AST y registro de asistencia.",
                frecuencia: "mensual",
                evidencia: "Análisis de riesgos (AST) elaborado para difusión y registro de asistencia."
            },
            {
                codigo: "2.2",
                actividad: "E-2 Cumplimiento de protocolos MINSAL",
                descripcion: "Realizar implementación, ejecución, seguimiento y control de actividades asociadas a los siguientes protocolos:\na) PREXOR;\nb) TMERT;\nc) MMC;\nd) Radiación UV;\ne) Psicosocial;\nEl criterio de cumplimiento corresponderá al 90% de las tareas planificadas mensualmente por la empresa contratista, esto según planificación que debe ser abordada por cada empresa. (carta gantt)",
                frecuencia: "mensual",
                evidencia: "Registros generales de implementación"
            }
        ]
    },
    {
        item: "3",
        nombre: "ELEMENTO 5: Competencias y capacitación del personal",
        actividades: [
            {
                codigo: "3.1",
                actividad: "E-5 Ejecución de las inducciones, de acuerdo al D.S. N°44 (Charla ODI)",
                descripcion: "Consiste en realizar la inducción de todo trabajador nuevo, reasignación de cargo, o que haya estado un periodo extenso sin realizar las labores para las cuales fue contratado (ej. Licencia médica), o que haya reingresado posterior a un accidente. Par dar cumplimiento a este ítem se requiere un registro individualizado de capacitación con datos mínimos tales como: nombre, rut, cargo que desarrollará, empresa por la cual realiza la inducción, fecha, hora inicio, hora de término. ODI firmada por trabajador (La ODI es responsabilidad de EECC, Abastible realiza charla de ingreso a planta)",
                frecuencia: "mensual",
                evidencia: "Registro individualizado de capacitación"
            },
            {
                codigo: "3.2",
                actividad: "E-5 Cumplimiento de plan de capacitación anual",
                descripcion: "Ejecución de las capacitaciones de acuerdo a plan anual de capacitación que se haya asignado al segmento de distribución GR, ya sea en plataforma ACHS, en AULA (platafora disponibilizada por Abastible), o las proporcionadas en forma directa por la jefatura o línea de supervisión. Para dar cumplimiento a este ítem se debe mantener disponible e registro de asistencia, diploma de la plataforma a la cual se acceda.",
                frecuencia: "mensual",
                evidencia: "Registro de Asistencia"
            }
        ]
    },
    {
        item: "4",
        nombre: "ELEMENTO 6: Operaciones / ELEMENTO 7: Integridad Mecánica",
        actividades: [
            {
                codigo: "4.1",
                actividad: "Verificación de correcta aplicación de Check List salida y retorno de camión granel, digitalizados.",
                descripcion: "Asegurar que las tripulaciones estén realizando el 100% de los check correctamente, verificando en terreno una muestra.",
                frecuencia: "mensual",
                evidencia: "Check list ejecutados en plataforma correspondiente."
            },
            {
                codigo: "4.2",
                actividad: "Gestión de cierre de tarjetas",
                descripcion: "Gestionar cierre de tarjetas levantadas a la EECC y por la empresa contratista. Revisión Mensual de cierre de tarjetas.",
                frecuencia: "mensual",
                evidencia: "Check list salida camión granel"
            }
        ]
    },
    {
        item: "5",
        nombre: "ELEMENTO 9: SERVICIOS DE TERCEROS",
        actividades: [
            {
                codigo: "5.1",
                actividad: "Garantizar el 100% de Acreditación para EECC y trabajadores que prestan servicio activo en Abastible",
                descripcion: "Consiste en evidenciar estatus de acreditacion desde plataforma de control, los casos que no cumplan el 100% deben estar gestionadas y en seguimiento para dar conformidad a esta actividad.",
                frecuencia: "mensual",
                evidencia: "Plataforma OVAL"
            },
            {
                codigo: "5.2",
                actividad: "Garantizar el 100% en Verificación laboral [pago de obligaciones laborales y previsionales]",
                descripcion: "Consiste en evidenciar el estatus de cumplimiento desde la plataforma de control, los casos que no cumplan con el 100% deberán gestionar las contingencias para dar conformidad a esta actividad Supervisor EECC",
                frecuencia: "mensual",
                evidencia: "Plataforma OVAL"
            },
            {
                codigo: "5.3",
                actividad: "Reaalizar reunión de accountability mensual, presentando Resumen estadístico y evidecncia de cada actividad ejecutada.",
                descripcion: "Consite en sesionar mensualmente con el administrador de contrato, para evaluacion periodica de desempeño.",
                frecuencia: "mensual",
                evidencia: "Registro de Asistencia"
            }
        ]
    },
    {
        item: "6",
        nombre: "ELEMENTO 10: Investigación de accidentes",
        actividades: [
            {
                codigo: "6.1",
                actividad: "E-10 Envío de informe de investigación en plazo.",
                descripcion: "Consiste en el envío del informe de investigación de acuerdo a la metodología y los plazos definidos por Abastible. En caso de que Abastible lo solicite, el contratista debe participar en reunión para revisión de la investigación. (reporte preliminar, simplificado, ICAM)",
                frecuencia: "cuando_aplique",
                evidencia: "Correo envío de investigación"
            },
            {
                codigo: "6.2",
                actividad: "E-10 Verificación del cierre de las acciones correctivas derivadas de informes de investigación de accidentes",
                descripcion: "Verificar el estado de cierre de las acciones correctivas derivadas de informes de investigación de accidentes y hacer seguimiento al cierre. Esta información se lleva mediante un indicador llamado \"IMC\" índice de medidas correctivas, indicador que debe estar siempre al 100%.",
                frecuencia: "mensual",
                evidencia: "Registro de acciones correctivas, según lo indicado en el plan de acción."
            }
        ]
    },
    {
        item: "7",
        nombre: "ELEMENTO 12: Evaluación y Mejora de la Integridad de las Operaciones",
        actividades: [
            {
                codigo: "7.1",
                actividad: "E-12 Nro. De Incidentes no registrables",
                descripcion: "Nro de Incidentes no registrables ocurridos en el mes. (Seguridad de personas que no afecte indicadores)\nEn esta actividad se debe hacer entrega del RESUMEN ESTADÍSTICO para dar un CUMPLE a la actividad.",
                frecuencia: "mensual",
                evidencia: "Resumen Estadístico"
            },
            {
                codigo: "7.2",
                actividad: "E-12 Nro. De Incidentes registrables",
                descripcion: "Nro de Incidentes registrables ocurridos en el mes (asociados a seguridad de personas, indicadores a los cuales se relaciona IFF - IFT - IGT).\nEn esta actividad se debe hacer entrega del RESUMEN ESTADÍSTICO para dar un CUMPLE a la actividad.",
                frecuencia: "mensual",
                evidencia: "Resumen Estadístico"
            }
        ]
    }
];

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Cleanup Old Data
        const PROG_NOMBRE = "OIEM Distribución Granel";
        console.log(`Cleaning up program: ${PROG_NOMBRE}...`);
        const existing = await Programa.findOne({ where: { nombre: PROG_NOMBRE } });

        let prog;
        if (existing) {
            // Delete activities and elements first
            const elements = await Elemento.findAll({ where: { programa_id: existing.id } });
            for (const el of elements) {
                await Actividad.destroy({ where: { elemento_id: el.id } });
                await el.destroy();
            }
            await existing.destroy();
            console.log('Old program deleted.');
        }

        // 2. Create Program
        console.log('Creating new program...');
        prog = await Programa.create({
            nombre: PROG_NOMBRE,
            descripcion: 'Programa generado desde especificaciones visuales (Imágenes e1-e7)',
            meta_cumplimiento: 90, // Inferred from some descriptions
            activo: true
        });

        // 3. Loop and Create
        for (const elData of GRANEL_DATA) {
            console.log(`Creating Element: ${elData.nombre}`);
            const element = await Elemento.create({
                programa_id: prog.id,
                numero: elData.item,
                nombre: elData.nombre, // Full header name
                descripcion: elData.nombre,
                orden: parseInt(elData.item)
            });

            for (const actData of elData.actividades) {
                console.log(`  > Creating Activity: ${actData.codigo}`);

                // Construct rich description with criteria + evidence requirement
                const criteriaText = `Evidencia esperada: ${actData.evidencia}`;

                await Actividad.create({
                    elemento_id: element.id,
                    codigo: actData.codigo.substring(0, 20),
                    actividad: actData.actividad, // TEXT type
                    descripcion: actData.descripcion, // TEXT type
                    criterios: criteriaText, // TEXT type
                    frecuencia: actData.frecuencia,
                    requiere_evidencia: true,
                    orden: parseFloat(actData.codigo) || 0
                });
            }
        }

        console.log('Seeding Completed Successfully!');

        // Output for Blueprint JSON
        // We can just dump GRANEL_DATA but we want the IDs if needed? 
        // For blueprint appendix, the static structure is fine.

        process.exit(0);

    } catch (e) {
        console.error('Seeding Failed:', e);
        process.exit(1);
    }
}

main();
