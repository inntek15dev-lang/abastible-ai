const { sequelize } = require('./database/models');

async function run() {
    try {
        console.log("🔄 Iniciando migración de clave primaria (usu_id) en base de datos...");
        
        // 1. Ensure all users have a valid usu_id
        await sequelize.query("UPDATE users SET usu_id = id WHERE usu_id IS NULL");
        console.log("✅ Campo usu_id actualizado en tabla users");

        // 2. Update child table references
        const tablesToUpdate = [
            "UPDATE contratista_usuarios cu JOIN users u ON cu.user_id = u.id SET cu.user_id = u.usu_id",
            "UPDATE vinculacion_usuarios vu JOIN users u ON vu.user_id = u.id SET vu.user_id = u.usu_id",
            "UPDATE administraciones a JOIN users u ON a.administrador_contrato_id = u.id SET a.administrador_contrato_id = u.usu_id",
            "UPDATE contratista_asignaciones ca JOIN users u ON ca.user_id = u.id SET ca.user_id = u.usu_id",
            "UPDATE contratista_asignaciones ca JOIN users u ON ca.administrador_contrato_id = u.id SET ca.administrador_contrato_id = u.usu_id",
            "UPDATE registros r JOIN users u ON r.user_id = u.id SET r.user_id = u.usu_id",
            "UPDATE registros r JOIN users u ON r.auditado_por = u.id SET r.auditado_por = u.usu_id",
            "UPDATE evidencias e JOIN users u ON e.user_id = u.id SET e.user_id = u.usu_id",
            "UPDATE hallazgos h JOIN users u ON h.auditor_id = u.id SET h.auditor_id = u.usu_id",
            "UPDATE compromisos c JOIN users u ON c.responsable_id = u.id SET c.responsable_id = u.usu_id",
            "UPDATE compromisos c JOIN users u ON c.creado_por_id = u.id SET c.creado_por_id = u.usu_id",
            "UPDATE auditoria_comentarios ac JOIN users u ON ac.user_id = u.id SET ac.user_id = u.usu_id",
            "UPDATE solicitudes_reaperturas sr JOIN users u ON sr.solicitante_id = u.id SET sr.solicitante_id = u.usu_id",
            "UPDATE solicitudes_reaperturas sr JOIN users u ON sr.aprobador_id = u.id SET sr.aprobador_id = u.usu_id",
            "UPDATE documentos d JOIN users u ON d.user_id = u.id SET d.user_id = u.usu_id"
        ];

        for (const query of tablesToUpdate) {
            try {
                await sequelize.query(query);
                console.log(`✅ Consulta ejecutada con éxito: ${query.substring(0, 50)}...`);
            } catch (err) {
                console.warn(`⚠️ Error ejecutando consulta: ${query.substring(0, 50)}... (${err.message})`);
            }
        }

        console.log("🎉 Migración completada exitosamente!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error en la migración:", error);
        process.exit(1);
    }
}

run();
