const {
    sequelize,
    Registro,
    RegistroActividad,
    Evidencia,
    Hallazgo,
    Compromiso,
    SolicitudReapertura,
    AuditoriaComentario,
    RegistroLog,
    Administracion,
    ContratistaAsignacion,
    Vinculacion,
    Contratista,
    TipoContratista,
    Dependencia,
    User,
    Documento
} = require('../src/database/models');

async function parkoCleanup() {
    const transaction = await sequelize.transaction();
    try {
        console.log('🚨 INICIANDO PROTOCOLO PARKO: LIMPIEZA TOTAL DE BASE DE DATOS 🚨');

        // 0. Legacy Tables (Raw SQL - Zombie Data)
        console.log('🗑️ Eliminando tablas legadas (postulaciones, licitaciones)...');
        // Check if tables exist before deleting? Or just try deleting rows.
        // Safer to try/catch individual raw queries if table doesn't exist, but SQL might throw error.
        // We can just run DELETE FROM if we are sure they exist or use checking logic.
        // Given complexity, I'll try catching errors for these specific queries or assume they exist based on previous error.
        try {
            await sequelize.query('DELETE FROM postulaciones', { transaction });
        } catch (e) { console.warn('⚠️ No se pudo eliminar de postulaciones (¿Tabla no existe?):', e.message); }

        try {
            await sequelize.query('DELETE FROM licitaciones', { transaction });
        } catch (e) { console.warn('⚠️ No se pudo eliminar de licitaciones (¿Tabla no existe?):', e.message); }


        // 0.5 Documents (Polymorphic)
        console.log('🗑️ Eliminando documentos...');
        await Documento.destroy({ where: {}, transaction });


        // 1. Compliance (Children of Registro)
        console.log('🗑️ Eliminando evidencias...');
        await Evidencia.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando compromisos...');
        await Compromiso.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando hallazgos...');
        await Hallazgo.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando solicitudes de reapertura...');
        await SolicitudReapertura.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando auditorías/comentarios...');
        await AuditoriaComentario.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando logs de registros...');
        await RegistroLog.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando actividades de registros...');
        await RegistroActividad.destroy({ where: {}, transaction });

        // 2. Compliance (Parent)
        console.log('🗑️ Eliminando registros principales...');
        await Registro.destroy({ where: {}, transaction });

        // 3. Assignments & Links
        console.log('🗑️ Eliminando administraciones (User <-> Vinculacion)...');
        await Administracion.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando asignaciones legadas (ContratistaAsignacion)...');
        await ContratistaAsignacion.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando vinculaciones (Contratista <-> Servicio <-> Dependencia)...');
        await Vinculacion.destroy({ where: {}, transaction });

        // 4. Contractor Users
        console.log('🗑️ Eliminando usuarios contratistas (admin/user)...');
        // Delete users with specific roles or linked to contractors
        // We'll target roles that start with 'contratista' to be safe but broad enough
        // Also checking contratista_id is not null as a backup
        await User.destroy({
            where: sequelize.literal("role IN ('contratista_admin', 'contratista_user') OR contratista_id IS NOT NULL"),
            transaction
        });

        // 5. Core Entities
        console.log('🗑️ Eliminando contratistas...');
        await Contratista.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando servicios (TipoContratista)...');
        await TipoContratista.destroy({ where: {}, transaction });

        console.log('🗑️ Eliminando dependencias...');
        await Dependencia.destroy({ where: {}, transaction });

        await transaction.commit();
        console.log('✅ PROTOCOLO PARKO EJECUTADO CON ÉXITO: BD LIMPIA.');
        console.log('💡 Ahora puedes proceder a sincronizar desde la UI.');

    } catch (error) {
        await transaction.rollback();
        console.error('❌ ERROR CRÍTICO EN PROTOCOLO PARKO:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

parkoCleanup();
