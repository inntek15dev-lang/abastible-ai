const { sequelize, VinculacionUsuario } = require('../src/database/models');

async function createTable() {
    try {
        console.log('🔄 Creating VinculacionUsuario table...');
        await VinculacionUsuario.sync();
        console.log('✅ Table vinculacion_usuarios created or already exists.');
    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await sequelize.close();
    }
}

createTable();
