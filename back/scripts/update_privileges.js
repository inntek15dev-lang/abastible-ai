const { Role, Privilegio, sequelize } = require('../src/database/models');

async function grantProgramAccess() {
    try {
        console.log('Starting privilege update...');

        // 1. Find the Role
        const role = await Role.findOne({ where: { name: 'contratista_user' } });
        if (!role) {
            console.error('Role contratista_user not found!');
            return;
        }
        console.log(`Found role: ${role.name} (ID: ${role.id})`);

        // 2. Check for existing privilege
        let privilege = await Privilegio.findOne({
            where: {
                role_id: role.id,
                ref_modulo: 'Programas'
            }
        });

        if (privilege) {
            console.log('Privilege exists. Updating...');
            await privilege.update({
                read: 1,
                write: 0,
                excec: 0
            });
        } else {
            console.log('Privilege does not exist. Creating...');
            await Privilegio.create({
                role_id: role.id,
                ref_modulo: 'Programas',
                read: 1,
                write: 0,
                excec: 0
            });
        }

        console.log('Privilege updated successfully: Programas [R:1, W:0, X:0] for contratista_user');

    } catch (error) {
        console.error('Error updating privileges:', error);
    } finally {
        await sequelize.close();
    }
}

grantProgramAccess();
