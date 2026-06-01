const sequelize = require('./src/database/index');

(async () => {
    try {
        console.log('Adding numero_contrato to compromisos...');
        await sequelize.query("ALTER TABLE compromisos ADD COLUMN numero_contrato VARCHAR(255) NULL AFTER contratista_asignacion_id");
        await sequelize.query("CREATE INDEX idx_compromisos_numero_contrato ON compromisos(numero_contrato)");
        console.log('Column and Index added.');
    } catch (e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error(e);
        }
    } finally {
        await sequelize.close();
    }
})();
