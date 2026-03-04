const sequelize = require('./src/database');
const models = require('./src/database/models');

async function check() {
    console.log('--- Database Consistency Audit ---');
    try {
        await sequelize.authenticate();
        const results = [];

        for (const name of Object.keys(models)) {
            if (name === 'sequelize' || name === 'Sequelize') continue;
            const model = models[name];
            try {
                const [cols] = await sequelize.query(`DESCRIBE ${model.tableName}`);
                const modelAttrs = model.rawAttributes;
                const modelCols = Object.keys(modelAttrs).map(attr => modelAttrs[attr].field || attr);
                const tableCols = cols.map(c => c.Field);

                const missingInTable = modelCols.filter(c => !tableCols.includes(c));
                const missingInModel = tableCols.filter(c => !modelCols.includes(c));

                if (missingInTable.length > 0 || missingInModel.length > 0) {
                    results.push({
                        model: name,
                        table: model.tableName,
                        missingInTable,
                        missingInModel
                    });
                }
            } catch (e) {
                results.push({ model: name, table: model.tableName, error: e.message });
            }
        }

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await sequelize.close();
    }
}

check();
