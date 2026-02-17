const { sequelize } = require('../src/database/models');

async function verifySchema() {
    try {
        console.log('🔍 Inspecting vinculaciones table schema...');
        const [columns] = await sequelize.query("SHOW COLUMNS FROM vinculaciones");

        const fields = columns.filter(c => ['fecha_inicio_contrato', 'fecha_termino_contrato'].includes(c.Field));

        if (fields.length === 0) {
            console.error('❌ Columns NOT FOUND!');
        } else {
            fields.forEach(f => {
                console.log(`✅ Column: ${f.Field} | Type: ${f.Type} | Null: ${f.Null} | Default: ${f.Default}`);
            });
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

verifySchema();
