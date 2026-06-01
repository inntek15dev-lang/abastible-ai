require('dotenv').config();
const { Registro, RegistroLog, User, Programa, ContratistaAsignacion, TipoContratista, Dependencia, RegistroActividad, Actividad, Elemento, Evidencia, Hallazgo } = require('./src/database/models');

async function test() {
    try {
        console.log('Testing Query...');
        const r = await Registro.findByPk(5, {
            include: [
                { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'eecc_nombre', 'rut'] },
                { model: RegistroLog, as: 'logs', include: [{ model: User, as: 'usuario', attributes: ['name', 'role'] }] },
                { model: User, as: 'auditor', attributes: ['id', 'name'] },
                {
                    model: Programa,
                    as: 'programa',
                    attributes: ['id', 'nombre']
                },
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
                            attributes: ['id', 'archivo_url', 'nombre_archivo']
                        },
                        {
                            model: Hallazgo,
                            as: 'hallazgos',
                            attributes: ['id', 'tipo', 'descripcion', 'estado']
                        }
                    ]
                },
            ]
        });
        console.log('Result:', JSON.stringify(r ? r.toJSON() : 'Not Found', null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    }
}
test();
