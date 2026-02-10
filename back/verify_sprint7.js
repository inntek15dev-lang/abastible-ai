require('dotenv').config();
const { Role, Privilegio, User, sequelize } = require('./src/database/models');

async function verifyPrivileges() {
    try {
        console.log('🧪 Starting Privilege Verification...');

        // 1. Create Role
        console.log('1. Creating Test Role "Supervisor_Test"...');
        const role = await Role.create({ name: 'Supervisor_Test', guard_name: 'web' });
        console.log('   ✅ Role Created:', role.id);

        // 2. Assign Privileges
        console.log('2. Assigning Read-Only access to "Registros"...');
        await Privilegio.create({
            role_id: role.id,
            ref_modulo: 'Registros',
            read: 1,
            write: 0,
            excec: 0
        });
        console.log('   ✅ Privilege Assigned');

        // 3. Verify
        const privs = await Privilegio.findAll({ where: { role_id: role.id } });
        const regPriv = privs.find(p => p.ref_modulo === 'Registros');

        if (regPriv && regPriv.read && !regPriv.write) {
            console.log('   ✅ Verification SUCCESS: Role has Read-Only access.');
        } else {
            console.error('   ❌ Verification FAILED: Privilege mismatch', JSON.stringify(regPriv, null, 2));
        }

        // Cleanup
        console.log('4. Cleaning up...');
        await Privilegio.destroy({ where: { role_id: role.id } });
        await role.destroy();
        console.log('   ✅ Cleanup Complete');

    } catch (error) {
        console.error('❌ Error during verification:', error);
    }
}

verifyPrivileges();
