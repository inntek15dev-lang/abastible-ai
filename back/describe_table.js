const sequelize = require('./src/database/index');
const fs = require('fs');

(async () => {
    try {
        const [desc] = await sequelize.query("DESCRIBE contratista_asignaciones");
        fs.writeFileSync('table_desc.txt', JSON.stringify(desc, null, 2));
    } catch (e) {
        fs.writeFileSync('table_desc.txt', 'Error: ' + e.message);
    } finally {
        await sequelize.close();
    }
})();
