const { Privilegio, Role } = require('./src/database/models');

async function fixProgramasPrivileges() {
    try {
        const roles = await Role.findAll();
        const adcRole = roles.find(r => r.name === 'administrador_contrato');
        const contratistaAdminRole = roles.find(r => r.name === 'contratista_admin');
        const contratistaUserRole = roles.find(r => r.name === 'contratista_user');

        const targets = [
            { role: adcRole, write: 1 },
            { role: contratistaAdminRole, write: 0 },
            { role: contratistaUserRole, write: 0 }
        ];

        for (const target of targets) {
            if (target.role) {
                await Privilegio.findOrCreate({
                    where: { role_id: target.role.id, ref_modulo: 'Programas' },
                    defaults: {
                        read: 1,
                        write: target.write,
                        excec: 0
                    }
                });
                console.log(`✅ ${target.role.name}: 'Programas' privilege ensured.`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing privileges:', error);
        process.exit(1);
    }
}

fixProgramasPrivileges();
