require('dotenv').config();
const { RegistroLog, sequelize } = require('./src/database/models');

async function addLog() {
    try {
        console.log('📝 Adding test log to Registro 3...');
        await RegistroLog.create({
            registro_id: 3,
            user_id: 1, // Assuming user 1 exists (admin)
            accion: 'AUDITAR',
            descripcion: 'Auditoria iniciada (Prueba UI)',
            datos_nuevos: { estado: 'en_proceso' },
            ip_address: '127.0.0.1'
        });
        console.log('✅ Log added successfully to Registro 3');
    } catch (error) {
        console.error('❌ Error adding log:', error);
    }
}

addLog();
