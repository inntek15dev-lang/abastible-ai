const { Registro } = require('./src/database/models');
const fs = require('fs');

(async () => {
    try {
        const r = await Registro.findByPk(16);
        const status = r ? `ID: ${r.id}, Asig: ${r.contratista_asignacion_id}` : 'Not Found';
        fs.writeFileSync('reg_16_status.txt', status);
    } catch (e) {
        fs.writeFileSync('reg_16_status.txt', 'Error: ' + e.message);
    }
    process.exit(0);
})();
