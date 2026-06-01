const { sequelize } = require('./src/database/models');

async function fix() {
    try {
        console.log('Checking schema...');
        const [columns] = await sequelize.query("SHOW COLUMNS FROM registros");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('programa_id')) {
            console.log('Adding programa_id column...');
            await sequelize.query("ALTER TABLE registros ADD COLUMN programa_id BIGINT UNSIGNED NULL");
        } else {
            console.log('programa_id already exists.');
        }

        if (!columnNames.includes('dependencia_id')) {
            console.log('Adding dependencia_id column...');
            await sequelize.query("ALTER TABLE registros ADD COLUMN dependencia_id BIGINT UNSIGNED NULL");
        } else {
            console.log('dependencia_id already exists.');
        }

        if (columnNames.includes('auditor_id') && !columnNames.includes('auditado_por')) {
            console.log('Renaming auditor_id to auditado_por...');
            try {
                await sequelize.query("ALTER TABLE registros RENAME COLUMN auditor_id TO auditado_por");
            } catch (err) {
                console.error('Rename failed (might be MariaDB/older MySQL versions syntax), trying CHANGE COLUMN:', err.message);
                // Fallback for older MySQL/MariaDB
                await sequelize.query("ALTER TABLE registros CHANGE COLUMN auditor_id auditado_por BIGINT UNSIGNED NULL");
            }
        } else if (columnNames.includes('auditado_por')) {
            console.log('auditado_por already exists.');
        }

        if (!columnNames.includes('auditado')) {
            console.log('Adding auditado column...');
            await sequelize.query("ALTER TABLE registros ADD COLUMN auditado TINYINT(1) NOT NULL DEFAULT 0");
        }

        if (!columnNames.includes('cerrado')) {
            console.log('Adding cerrado column...');
            await sequelize.query("ALTER TABLE registros ADD COLUMN cerrado TINYINT(1) NOT NULL DEFAULT 0");
        }

        if (!columnNames.includes('observaciones_auditoria')) {
            console.log('Adding observaciones_auditoria column...');
            await sequelize.query("ALTER TABLE registros ADD COLUMN observaciones_auditoria TEXT NULL");
        }

        console.log('Checking actividades schema...');
        const [actColumns] = await sequelize.query("SHOW COLUMNS FROM actividades");
        const actColumnNames = actColumns.map(c => c.Field);

        if (!actColumnNames.includes('actividad')) {
            console.log('Adding actividad column to actividades...');
            await sequelize.query("ALTER TABLE actividades ADD COLUMN actividad TEXT NULL");
            console.log('Populating actividad column from descripcion...');
            await sequelize.query("UPDATE actividades SET actividad = descripcion WHERE actividad IS NULL");
        }


        console.log('Schema update complete.');
    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await sequelize.close();
    }
}

fix();
