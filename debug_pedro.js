const { Contratista, Vinculacion, TipoContratista, Administracion, User, Programa } = require('./back/src/database/models/index');
const { Op } = require('sequelize');

async function debug() {
    try {
        console.log('--- DIAGNOSTIC START ---');

        // 1. Find Pedro
        const pedro = await User.findOne({
            where: { name: { [Op.like]: '%Pedro%' } }
        });

        if (!pedro) {
            console.log('User Pedro not found');
        } else {
            console.log(`User Found: ID=${pedro.id}, Name=${pedro.name}, Role=${pedro.role}`);

            // 2. Find Pedro's Administrations
            const admins = await Administracion.findAll({
                where: { administrador_contrato_id: pedro.id },
                include: [{
                    model: Vinculacion,
                    as: 'vinculacion',
                    include: [
                        { model: Contratista, as: 'contratista' },
                        { model: TipoContratista, as: 'servicio' }
                    ]
                }]
            });

            console.log(`Pedro has ${admins.length} administrations assigned.`);
            admins.forEach((a, i) => {
                const v = a.vinculacion || {};
                const c = v.contratista || {};
                const s = v.servicio || {};
                console.log(`${i + 1}. AdminID=${a.id}, Active=${a.activo} | Co=${c.nombre}, Svc=${s.nombre}, SvcActive=${v.activo}, ProgramaID=${s.programa_id}`);
            });
        }

        // 3. Find Grupo Norte
        const gn = await Contratista.findOne({
            where: { nombre: { [Op.like]: '%GRUPO NORTE%' } }
        });

        if (!gn) {
            console.log('Contratista GRUPO NORTE not found');
        } else {
            console.log(`Contratista Found: ID=${gn.id}, Name=${gn.nombre}`);

            // 4. Find GN Vinculaciones
            const vgn = await Vinculacion.findAll({
                where: { contratista_id: gn.id },
                include: [{ model: TipoContratista, as: 'servicio' }]
            });

            console.log(`GRUPO NORTE has ${vgn.length} vinculaciones.`);
            vgn.forEach((v, i) => {
                const s = v.servicio || {};
                console.log(`${i + 1}. VincID=${v.id}, Active=${v.activo}, Svc=${s.nombre}, ProgramaID=${s.programa_id}`);
            });
        }

        console.log('--- DIAGNOSTIC END ---');
    } catch (error) {
        console.error('DIAGNOSTIC ERROR:', error);
    } finally {
        process.exit();
    }
}

debug();
