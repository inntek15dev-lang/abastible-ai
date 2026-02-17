const { sequelize } = require('../src/database/models');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const queryInterface = sequelize.getQueryInterface();
        const tableDescription = await queryInterface.describeTable('vinculaciones');

        if (!tableDescription.periodo_inicio) {
            console.log('Adding periodo_inicio column...');
            await queryInterface.addColumn('vinculaciones', 'periodo_inicio', {
                type: 'DATE',
                allowNull: true
            });
            console.log('Column added.');
        } else {
            console.log('Column periodo_inicio already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
