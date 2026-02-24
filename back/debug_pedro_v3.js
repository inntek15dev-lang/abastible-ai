const { Contratista, Vinculacion, TipoContratista, Administracion, User, Programa } = require('./src/database/models/index');
const { Op } = require('sequelize');

async function debug() {
    try {
        const pedro = await User.findOne({ where: { name: { [Op.like]: '%Pedro%' } } });
        if (!pedro) { console.log('Pedro not found'); return; }

        const admins = await Administracion.findAll({
            where: { administrador_contrato_id: pedro.id, activo: 1 },
            include: [{
                model: Vinculacion,
                as: 'vinculacion',
                include: [
                    { model: Contratista, as: 'contratista' },
                    { model: TipoContratista, as: 'servicio' }
                ]
            }]
        });

        console.log(`Pedro (ID:${pedro.id}) has ${admins.length} active administrations.`);

        for (const a of admins) {
            const v = a.vinculacion;
            if (!v) {
                console.log(`- Admin ID ${a.id}: Linked Vinculacion NOT FOUND`);
                continue;
            }
            const c = v.contratista;
            const s = v.servicio;
            console.log(`- Admin ID ${a.id}: Co="${c?.nombre}", Svc="${s?.nombre}", VincActive=${v.activo}, SvcProgID=${s?.programa_id}`);
        }

        const gn = await Contratista.findOne({ where: { nombre: { [Op.like]: '%GRUPO NORTE%' } } });
        if (gn) {
            console.log(`\nGRUPO NORTE (ID:${gn.id}) records:`);
            const vincs = await Vinculacion.findAll({
                where: { contratista_id: gn.id },
                include: [{ model: TipoContratista, as: 'servicio' }]
            });
            for (const v of vincs) {
                const s = v.servicio;
                const adminForPedro = await Administracion.findOne({ where: { vinculacion_id: v.id, administrador_contrato_id: pedro.id } });
                console.log(`- Vinc ID ${v.id}: Active=${v.activo}, Svc="${s?.nombre}", ProgID=${s?.programa_id}, PedroAdmin=${!!adminForPedro}, AdminActive=${adminForPedro?.activo}`);
            }
        }

    } catch (e) { console.error(e); }
    finally { process.exit(); }
}

debug();
