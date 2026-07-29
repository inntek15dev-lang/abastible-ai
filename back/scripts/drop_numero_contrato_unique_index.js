// Elimina el índice ÚNICO físico sobre vinculaciones.numero_contrato.
// Uso: node scripts/drop_numero_contrato_unique_index.js   (desde back/)
// Integrado al deploy (.github/workflows/deploy-*.yml), junto a
// scripts/drop_physical_foreign_keys.js.
//
// POR QUÉ: se confirmó con datos reales de OVAL que un mismo numero_contrato puede
// cubrir MÁS DE UNA combinación servicio/dependencia para la misma empresa (contrato
// "marco" multi-ubicación — ej. contrato 637 de SODEXO CHILE SPA). La restricción única
// física (creada en algún momento por sequelize.sync() a partir del `unique: true` que
// tenía el modelo, no declarada en ningún archivo de migración de este repo — mismo
// patrón que las FK ocultas de drop_physical_foreign_keys.js) bloqueaba la sincronización
// completa con un "Duplicate entry" cada vez que una empresa tenía este caso. La
// identidad real de una Vinculación es la combinación (contratista_id, servicio_id,
// dependencia_id, subgerencia_id, gerencia_id) — eso es lo único que debe ser único, y
// ya lo gestiona el propio findOrCreate del sincronizador, no una constraint de BD sobre
// numero_contrato.
//
// Se re-verifica en cada deploy (como drop_physical_foreign_keys.js): es barato (una
// consulta a information_schema) y así detecta si el índice reaparece por cualquier vía.

const { sequelize } = require('../src/database/models');

async function run() {
    try {
        const [indexes] = await sequelize.query(`
            SELECT DISTINCT INDEX_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'vinculaciones'
              AND COLUMN_NAME = 'numero_contrato'
              AND NON_UNIQUE = 0
              AND INDEX_NAME != 'PRIMARY'
        `);

        if (indexes.length === 0) {
            console.log('ℹ️ No hay índice único físico sobre vinculaciones.numero_contrato. Nada que hacer.');
        } else {
            for (const idx of indexes) {
                console.log(`🔧 Eliminando índice único: vinculaciones.${idx.INDEX_NAME}`);
                await sequelize.query(`ALTER TABLE vinculaciones DROP INDEX \`${idx.INDEX_NAME}\``);
                console.log(`✅ Eliminado: ${idx.INDEX_NAME}`);
            }
        }

        console.log('🎉 Verificación de índice único de numero_contrato completada.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error eliminando índice único de numero_contrato:', error.message);
        process.exit(1);
    }
}

run();
