require('dotenv').config();
const { Registro, RegistroLog, User, ContratistaAsignacion, TipoContratista, Dependencia, RegistroActividad, Actividad,
    Elemento,
    Evidencia,
    Hallazgo,
    Programa } = require('./src/database/models');

async function test() {
    try {
        console.log('🔍 Testing Registro Query for ID: 3');
        const registro = await Registro.findByPk(3, {
            include: [
                { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'eecc_nombre', 'rut'] },
                { model: RegistroLog, as: 'logs', include: [{ model: User, as: 'usuario', attributes: ['name', 'role'] }] },
                { model: User, as: 'auditor', attributes: ['id', 'name'] },
                { model: Programa, as: 'programa', attributes: ['id', 'nombre'] },
                {
                    model: ContratistaAsignacion,
                    as: 'asignacion',
                    include: [
                        { model: TipoContratista, as: 'tipoContratista' },
                        { model: Dependencia, as: 'dependencia' }
                    ]
                },
                {
                    model: RegistroActividad,
                    as: 'actividades',
                    include: [
                        {
                            model: Actividad,
                            as: 'actividad',
                            include: [{ model: Elemento, as: 'elemento' }]
                        },
                        {
                            model: Evidencia,
                            as: 'evidencias',
                            attributes: ['id', 'ruta', 'nombre_archivo']
                        },
                        {
                            model: Hallazgo,
                            as: 'hallazgos',
                            attributes: ['id', 'tipo', 'descripcion', 'estado']
                        }
                    ]
                }
            ]
        });

        if (registro) {
            console.log('✅ Registro Found!');
            console.log('Logs count:', registro.logs ? registro.logs.length : 0);
            if (registro.logs && registro.logs.length > 0) {
                console.log('First Log:', JSON.stringify(registro.logs[0], null, 2));
            }
        } else {
            console.error('❌ Registro 4 NOT FOUND');
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    }
}
test();
