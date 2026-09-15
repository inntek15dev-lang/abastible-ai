// back/src/scripts/patch_compromisos_privileges.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, Role, Privilegio } = require('../database/models');

async function patch() {
    try {
        console.log('🔒 Otorgando todos los privilegios a administrador_contrato sobre Compromisos...');
        await sequelize.authenticate();

        const adcRole = await Role.findOne({ where: { name: 'administrador_contrato' } });
        if (!adcRole) {
            console.error('❌ Rol administrador_contrato no encontrado en BD.');
            process.exit(1);
        }

        const [priv, created] = await Privilegio.findOrCreate({
            where: { role_id: adcRole.id, ref_modulo: 'Compromisos' },
            defaults: { read: 1, write: 1, excec: 1 }
        });

        if (!created) {
            await priv.update({ read: 1, write: 1, excec: 1 });
            console.log('✅ Privilegios de Compromisos actualizados a R/W/X (1,1,1) para administrador_contrato.');
        } else {
            console.log('✅ Privilegio Compromisos creado con R/W/X (1,1,1) para administrador_contrato.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando parche de privilegios:', error);
        process.exit(1);
    }
}

patch();
