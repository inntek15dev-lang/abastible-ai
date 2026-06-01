const { sequelize } = require('../src/database/models');

async function updateSchema() {
    try {
        console.log('🔄 Checking Vinculaciones schema for contract dates...');
        const [columns] = await sequelize.query("SHOW COLUMNS FROM vinculaciones");
        const columnNames = columns.map(c => c.Field);

        // Add fecha_inicio_contrato
        if (!columnNames.includes('fecha_inicio_contrato')) {
            console.log('➕ Adding fecha_inicio_contrato column...');
            await sequelize.query("ALTER TABLE vinculaciones ADD COLUMN fecha_inicio_contrato DATE NULL");
        } else {
            console.log('✅ fecha_inicio_contrato already exists.');
        }

        // Add fecha_termino_contrato
        if (!columnNames.includes('fecha_termino_contrato')) {
            console.log('➕ Adding fecha_termino_contrato column...');
            await sequelize.query("ALTER TABLE vinculaciones ADD COLUMN fecha_termino_contrato DATE NULL");
        } else {
            console.log('✅ fecha_termino_contrato already exists.');
        }

        console.log('🎉 Schema update complete.');
    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        await sequelize.close();
    }
}

updateSchema();
