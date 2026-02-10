// back/src/scripts/patch_granular_privileges.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, Role, Privilegio } = require('../database/models');

async function patch() {
    try {
        console.log('🔒 Patching Granular Component Privileges...');
        await sequelize.authenticate();

        const roles = await Role.findAll();
        const adminRole = roles.find(r => r.name === 'admin');
        const adcRole = roles.find(r => r.name === 'administrador_contrato');
        const contratistaAdmin = roles.find(r => r.name === 'contratista_admin');
        const contratistaUser = roles.find(r => r.name === 'contratista_user');

        if (!adminRole) { console.error('Admin role not found'); process.exit(1); }

        // Helper to add privilege if not exists
        const addPriv = async (roleId, module, r, w, x) => {
            const existing = await Privilegio.findOne({ where: { role_id: roleId, ref_modulo: module } });
            if (!existing) {
                await Privilegio.create({ role_id: roleId, ref_modulo: module, read: r ? 1 : 0, write: w ? 1 : 0, excec: x ? 1 : 0 });
                console.log(`✅ Added ${module} for Role ID ${roleId}`);
            } else {
                console.log(`ℹ️ ${module} already exists for Role ID ${roleId}`);
            }
        };

        // 1. Licitaciones Module (Base)
        // Admin: Full
        await addPriv(adminRole.id, 'Licitaciones', true, true, true);
        // ADC: Read
        await addPriv(adcRole.id, 'Licitaciones', true, false, false);
        // Contratistas: Read
        if (contratistaAdmin) await addPriv(contratistaAdmin.id, 'Licitaciones', true, false, false);
        if (contratistaUser) await addPriv(contratistaUser.id, 'Licitaciones', true, false, false);

        // 2. Licitaciones_Crear (Component) -> Admin Only
        await addPriv(adminRole.id, 'Licitaciones_Crear', true, true, true);

        // 3. Licitaciones_Postular (Component) -> Contratistas Only
        // Admin might need it for testing? Let's give it to admin too.
        await addPriv(adminRole.id, 'Licitaciones_Postular', true, true, true);
        if (contratistaAdmin) await addPriv(contratistaAdmin.id, 'Licitaciones_Postular', true, true, true);
        if (contratistaUser) await addPriv(contratistaUser.id, 'Licitaciones_Postular', true, true, true);
        // ADC shouldn't need to postular

        // 4. Registros_Exportar (Component) -> All who can read Registros
        await addPriv(adminRole.id, 'Registros_Exportar', true, true, true);
        await addPriv(adcRole.id, 'Registros_Exportar', true, true, true);
        if (contratistaAdmin) await addPriv(contratistaAdmin.id, 'Registros_Exportar', true, true, true);
        if (contratistaUser) await addPriv(contratistaUser.id, 'Registros_Exportar', true, true, true);

        console.log('🎉 Granular Privileges Applied!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Patch failed:', error);
        process.exit(1);
    }
}

patch();
