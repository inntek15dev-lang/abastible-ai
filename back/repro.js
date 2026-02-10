const {
    sequelize,
    Registro,
    User,
    Programa,
    ContratistaAsignacion,
    TipoContratista,
    Dependencia,
    RegistroActividad,
    Actividad
} = require('./src/database/models');

async function test() {
    try {
        console.log('Testing Registro.findAll...');
        const registros = await Registro.findAll({
            include: [
                { model: User, as: 'usuario', attributes: ['id', 'name', 'email', 'eecc_nombre', 'rut'] },
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
                    include: [{ model: Actividad, as: 'actividad' }]
                }
            ],
            limit: 1
        });
        console.log('Success:', registros.length);
    } catch (error) {
        console.error('Error Message:', error.message);
        if (error.sql) console.error('SQL:', error.sql);
    } finally {
        await sequelize.close();
    }
}

test();
