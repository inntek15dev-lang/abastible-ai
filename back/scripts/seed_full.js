const { User } = require('../src/database/models');
const bcrypt = require('bcryptjs');

async function seedAllUsers() {
    try {
        const password = await bcrypt.hash('123456', 10);

        const usersToSeed = [
            {
                email: 'admin@abastible.cl',
                name: 'Super Admin',
                role: 'admin',
                eecc_nombre: 'Abastible S.A.'
            },
            {
                email: 'contrato@abastible.cl',
                name: 'Administrador Contrato',
                role: 'administrador_contrato',
                eecc_nombre: 'Abastible S.A.' // Interno
            },
            {
                email: 'contratista@demo.cl',
                name: 'Contratista Demo Admin',
                role: 'contratista_admin',
                eecc_nombre: 'Constructora Demo Ltda'
            },
            {
                email: 'operativo@demo.cl',
                name: 'Contratista Operativo',
                role: 'contratista_user',
                eecc_nombre: 'Constructora Demo Ltda'
            }
        ];

        console.log('🌱 starting seed of users...');

        for (const u of usersToSeed) {
            const [user, created] = await User.findOrCreate({
                where: { email: u.email },
                defaults: {
                    ...u,
                    password: password,
                    activo: true
                }
            });

            if (created) {
                console.log(`✅ Created: ${u.role} -> ${u.email}`);
            } else {
                // Ensure role and active status are correct
                await user.update({
                    role: u.role,
                    activo: true,
                    eecc_nombre: u.eecc_nombre,
                    // Strict support: reset password
                    password: password
                });
                console.log(`🔄 Updated: ${u.role} -> ${u.email}`);
            }
        }

        console.log('✨ All roles/users enabled successfully.');

    } catch (error) {
        console.error('Error seeding users:', error);
    }
}

seedAllUsers();
