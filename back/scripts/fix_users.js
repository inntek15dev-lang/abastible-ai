const { User } = require('../src/database/models');
const bcrypt = require('bcryptjs');

async function fixUsers() {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);

        // 1. Ensure contrato@abastible.cl exists
        const [adminContrato, created] = await User.findOrCreate({
            where: { email: 'contrato@abastible.cl' },
            defaults: {
                name: 'Administrador Contrato',
                password: hashedPassword,
                role: 'administrador_contrato',
                activo: true
            }
        });

        if (created) {
            console.log('✅ Created user: contrato@abastible.cl');
        } else {
            console.log('ℹ️ User already exists: contrato@abastible.cl');
            // Force update role just in case
            await adminContrato.update({ role: 'administrador_contrato', password: hashedPassword });
            console.log('🔄 Updated role/password for: contrato@abastible.cl');
        }

        // 2. Ensure a Contractor Admin exists for testing
        await User.findOrCreate({
            where: { email: 'contratista@demo.cl' },
            defaults: {
                name: 'Contratista Demo Admin',
                password: hashedPassword,
                role: 'contratista_admin',
                eecc_nombre: 'Constructora Demo Ltda',
                activo: true
            }
        });
        console.log('✅ Verified/Created contractor: contratista@demo.cl');

    } catch (error) {
        console.error('Error fixing users:', error);
    }
}

fixUsers();
