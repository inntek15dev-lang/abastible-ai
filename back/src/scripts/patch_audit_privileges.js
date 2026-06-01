// back/src/scripts/patch_audit_privileges.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, User, Role, Privilegio } = require('../database/models');

async function patch() {
    try {
        console.log('🔒 Patching Privileges for Audit Separation...');
        await sequelize.authenticate();

        // 1. Get Roles
        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const adcRole = await Role.findOne({ where: { name: 'administrador_contrato' } });

        if (!adminRole || !adcRole) {
            console.error('❌ Roles not found. Run seed first?');
            process.exit(1);
        }

        // 2. Create 'Auditoria' privilege for Admin (Full)
        // Check if exists
        let adminAudit = await Privilegio.findOne({ where: { role_id: adminRole.id, ref_modulo: 'Auditoria' } });
        if (!adminAudit) {
            await Privilegio.create({
                role_id: adminRole.id,
                ref_modulo: 'Auditoria',
                read: 1,
                write: 1,
                excec: 1
            });
            console.log('✅ Created Auditoria privilege for Admin');
        }

        // 3. Create 'Auditoria' privilege for ADC (Read/Write/Exec)
        // ADC needs to: 
        // - Read audit data (Read)
        // - Perform audit/approve (Write/Excec) -> Let's use Write for 'Auditoria' generally, or Excec.
        // The route check will be requirePrivilege('Auditoria', 'write').
        let adcAudit = await Privilegio.findOne({ where: { role_id: adcRole.id, ref_modulo: 'Auditoria' } });
        if (!adcAudit) {
            await Privilegio.create({
                role_id: adcRole.id,
                ref_modulo: 'Auditoria',
                read: 1,
                write: 1, // To audit/approve
                excec: 0  // Maybe reserve generic exec? Or 1 if we map it to approve.
            });
            console.log('✅ Created Auditoria privilege for ADC');
        }

        // 4. Update 'Registros' privilege for ADC: REVOKE EXCEC (Delete)
        const adcRegistros = await Privilegio.findOne({ where: { role_id: adcRole.id, ref_modulo: 'Registros' } });
        if (adcRegistros) {
            if (adcRegistros.excec === 1) {
                await adcRegistros.update({ excec: 0 }); // REVOKE DELETE
                console.log('✅ Revoked Registros.excec (Delete) from ADC');
            } else {
                console.log('ℹ️ ADC Registros.excec was already 0');
            }
        }

        // 5. Update 'Reaperturas' privilege for ADC: REVOKE EXCEC if it was used for delete?
        // Wait, 'Reaperturas.excec' is used for 'reabrirDirectamente'. 
        // ADC is allowed to reopen directly? Matrix says YES ("Reabrir directamente (sin solicitud)": SI).
        // So we keep 'Reaperturas.excec' for ADC.

        console.log('🎉 Patch Applied Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Patch failed:', error);
        process.exit(1);
    }
}

patch();
