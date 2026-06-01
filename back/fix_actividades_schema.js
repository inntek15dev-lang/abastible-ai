const sequelize = require('./src/database');

async function fixActividades() {
    console.log('👷 Fixing schema for "actividades" table...');
    try {
        // Add template_url
        console.log('  Adding template_url column...');
        await sequelize.query('ALTER TABLE actividades ADD COLUMN template_url VARCHAR(255) NULL AFTER criterios');
        console.log('✅ Column added successfully.');
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('✅ Column already exists.');
        } else {
            console.error('❌ Error fixing schema:', error.message);
        }
    } finally {
        await sequelize.close();
    }
}

fixActividades();
