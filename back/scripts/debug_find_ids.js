const { Vinculacion, TipoContratista, Programa, User, Administracion } = require('../src/database/models');

async function find() {
    try {
        const v = await Vinculacion.findByPk(1, {
            include: [
                { model: TipoContratista, as: 'servicio' }
            ]
        });

        if (!v) {
            console.log('Vinculacion ID 1 not found');
            return;
        }

        const servicio = v.servicio;
        const programaId = servicio.programa_id;
        const programa = await Programa.findByPk(programaId);

        const users = await User.findAll({
            where: { contratista_id: v.contratista_id, activo: 1 }
        });

        const adcs = await User.findAll({
            where: { role: 'administrador_contrato', activo: 1 }
        });

        const administracion = await Administracion.findOne({
            where: { vinculacion_id: v.id, activo: 1 }
        });

        console.log('--- RESULTS ---');
        console.log({
            vinculacion_id: v.id,
            servicio_id: servicio.id,
            servicio_nombre: servicio.nombre,
            programa_id: programa ? programa.id : 'NULL',
            programa_nombre: programa ? programa.nombre : 'NULL',
            users: users.map(u => ({ id: u.id, name: u.name, role: u.role })),
            adcs: adcs.map(u => ({ id: u.id, name: u.name, role: u.role })),
            administracion_id: administracion ? administracion.id : 'NOT FOUND'
        });
    } catch (error) {
        console.error('Error in find:', error);
    } finally {
        process.exit();
    }
}

find();
