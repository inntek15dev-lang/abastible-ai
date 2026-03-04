const { Registro, RegistroActividad, Vinculacion, Dependencia, TipoContratista, Contratista, User } = require('./src/database/models');
const sequelize = require('./src/database');

async function debugStore() {
    console.log('--- Debugging Registro Store ---');
    try {
        // Find a valid user and vinculacion to test with
        const user = await User.findOne({ where: { role: 'contratista_admin' } });
        if (!user) {
            console.error('No contractor admin found for testing');
            return;
        }

        const vinculacion = await Vinculacion.findOne({
            include: [{ model: Dependencia, as: 'dependencia' }]
        });
        if (!vinculacion) {
            console.error('No vinculacion found for testing');
            return;
        }

        console.log(`Using User: ${user.name} (${user.id})`);
        console.log(`Using Vinculacion: ${vinculacion.id}`);

        const body = {
            contratista_asignacion_id: vinculacion.id,
            periodo: '2026-03-01',
            personas_nuevas: 5,
            dotacion_total: 20,
            programa_id: vinculacion.programa_id,
            actividades: [
                { actividad_id: 1, cumple: 1, responsable: 'Test', descripcion_contratista: 'Test Desc' }
            ]
        };

        // Simulated logic from controller
        const registro = await Registro.create({
            user_id: user.id,
            contratista_asignacion_id: body.contratista_asignacion_id,
            programa_id: body.programa_id || null,
            dependencia_id: vinculacion.dependencia_id || null,
            periodo: body.periodo,
            eecc_nombre: 'Test Company',
            dependencia: vinculacion.dependencia?.nombre || 'Test Dep',
            personas_nuevas: body.personas_nuevas,
            supervisores: 0,
            prevencionistas: 0,
            dotacion_total: body.dotacion_total,
            porcentaje_cumplimiento: 0,
            estado_auditoria: 'pendiente',
            cerrado: 0,
            auditado: 0
        });

        console.log('✅ Registro created:', registro.id);

        if (body.actividades.length > 0) {
            for (const act of body.actividades) {
                await RegistroActividad.create({
                    registro_id: registro.id,
                    actividad_id: act.actividad_id,
                    cumple: act.cumple,
                    responsable: act.responsable,
                    descripcion_contratista: act.descripcion_contratista
                });
            }
            console.log('✅ Activities created');
        }

    } catch (error) {
        console.error('❌ Error caught:', error);
        if (error.name === 'SequelizeValidationError') {
            console.error('Validation errors:', error.errors.map(e => e.message));
        }
    } finally {
        await sequelize.close();
    }
}

debugStore();
