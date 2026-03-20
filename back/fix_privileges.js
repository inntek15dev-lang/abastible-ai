
const { Privilegio, Role } = require('./src/database/models');

async function fixPrivileges() {
    try {
        const roles = await Role.findAll();
        const adcRole = roles.find(r => r.name === 'administrador_contrato');
        const contratistaAdminRole = roles.find(r => r.name === 'contratista_admin');

        if (adcRole) {
            await Privilegio.update(
                { excec: 0 },
                { where: { role_id: adcRole.id, ref_modulo: 'Reaperturas' } }
            );
            console.log('✅ ADC Reaperturas excec set to 0');
        }

        if (contratistaAdminRole) {
            await Privilegio.update(
                { excec: 0 },
                { where: { role_id: contratistaAdminRole.id, ref_modulo: 'Reaperturas' } }
            );
            console.log('✅ Contratista Admin Reaperturas excec set to 0');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing privileges:', error);
        process.exit(1);
    }
}

fixPrivileges();
