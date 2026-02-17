const { Privilegio, sequelize } = require('../database/models');

async function seedPrivileges() {
    try {
        console.log('--- Seeding Vinculaciones Privileges ---');

        const rolesToGrant = [1, 2]; // 1=admin, 2=admin_contrato
        const moduleName = 'Vinculaciones';

        for (const roleId of rolesToGrant) {
            const existing = await Privilegio.findOne({
                where: { role_id: roleId, ref_modulo: moduleName }
            });

            if (existing) {
                console.log(`Privilege exists for role ${roleId}, updating...`);
                await existing.update({ read: 1, write: 1, excec: 1 });
            } else {
                console.log(`Creating privilege for role ${roleId}`);
                await Privilegio.create({
                    role_id: roleId,
                    ref_modulo: moduleName,
                    read: 1,
                    write: 1,
                    excec: 1
                });
            }
        }
        console.log('Done!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding privileges:', error);
        process.exit(1);
    }
}

seedPrivileges();
