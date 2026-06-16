const { sequelize } = require('../src/database/models');

async function addTemplateUrlColumn() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        const queryInterface = sequelize.getQueryInterface();
        const tableDescription = await queryInterface.describeTable('actividades');

        if (!tableDescription.template_url) {
            console.log('⚠️ Column template_url does not exist. Adding it now...');
            await queryInterface.addColumn('actividades', 'template_url', {
                type: 'VARCHAR(255)',
                allowNull: true,
                after: 'criterios' // Try to place it after criterios if possible, though order doesn't strictly matter
            });
            console.log('✅ Column template_url added successfully.');
        } else {
            console.log('ℹ️ Column template_url already exists.');
        }

    } catch (error) {
        console.error('❌ Error updating database:', error);
    } finally {
        await sequelize.close();
    }
}

addTemplateUrlColumn();
