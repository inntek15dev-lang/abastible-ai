require('dotenv').config();
const { sequelize } = require('../src/database/models');

async function migrate() {
    try {
        console.log('🔄 Adding meta_cumplimiento column to programas table...');
        const queryInterface = sequelize.getQueryInterface();

        await queryInterface.addColumn('programas', 'meta_cumplimiento', {
            type: 'INTEGER',
            allowNull: false,
            defaultValue: 100
        });

        console.log('✅ Column meta_cumplimiento added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding column:', error);
        process.exit(1);
    }
}

migrate();
