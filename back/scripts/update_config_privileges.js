const { Role, Privilegio, sequelize } = require('../src/database/models');

async function updateConfigPrivileges() {
    try {
        console.log('Starting configuration privilege update...');

        // 1. Roles to process
        const roles = ['admin', 'administrador_contrato'];
        const moduleName = 'Gestion_Configuracion';

        for (const roleName of roles) {
            const role = await Role.findOne({ where: { name: roleName } });
            if (!role) {
                console.warn(`Role ${roleName} not found!`);
                continue;
            }

            // Check/Create Privilege
            let privilege = await Privilegio.findOne({
                where: { role_id: role.id, ref_modulo: moduleName }
            });

            if (privilege) {
                console.log(`Privilege ${moduleName} exists for ${roleName}. Ensuring full access...`);
                await privilege.update({ read: 1, write: 1, excec: 1 });
            } else {
                console.log(`Creating privilege ${moduleName} for ${roleName}...`);
                await Privilegio.create({
                    role_id: role.id,
                    ref_modulo: moduleName,
                    read: 1,
                    write: 1,
                    excec: 1
                });
            }
        }

        console.log('Configuration privileges updated successfully.');

    } catch (error) {
        console.error('Error updating config privileges:', error);
    } finally {
        await sequelize.close();
    }
}

updateConfigPrivileges();
