-- =====================================================
-- DATABASE SCHEMA - Auto-generated from documentation
-- Generated: 2026-01-28 15:46:00
-- Source: .agent/docs/*
-- Project: OIEM Abastible
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table: roles
-- Source: DOCUMENTACION.md (Módulo 11)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `guard_name` VARCHAR(255) NOT NULL DEFAULT 'web',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `roles_name_guard_unique` (`name`, `guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: dependencias
-- Source: DOCUMENTACION.md (Módulo 7)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dependencias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: tipos_contratista (Servicios)
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tipos_contratista` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: programas
-- Source: MATRIZ_FUNCIONALIDADES_POR_ROL.md (Módulo 7)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `programas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: users
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'contratista',
    `parent_id` BIGINT UNSIGNED NULL COMMENT 'FK a users.id para jerarquía de contratistas',
    `tipo_contratista_id` BIGINT UNSIGNED NULL COMMENT 'Asignación específica para operativos',
    `dependencia_id` BIGINT UNSIGNED NULL COMMENT 'Asignación específica para operativos',
    `eecc_nombre` VARCHAR(255) NULL COMMENT 'Razón Social',
    `rut` VARCHAR(20) NULL COMMENT 'RUT de la empresa o usuario',
    `telefono` VARCHAR(50) NULL,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`),
    KEY `users_parent_id_fk` (`parent_id`),
    KEY `users_tipo_contratista_id_fk` (`tipo_contratista_id`),
    KEY `users_dependencia_id_fk` (`dependencia_id`),
    CONSTRAINT `users_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `users_tipo_contratista_id_foreign` FOREIGN KEY (`tipo_contratista_id`) REFERENCES `tipos_contratista` (`id`) ON DELETE SET NULL,
    CONSTRAINT `users_dependencia_id_foreign` FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: elementos
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `elementos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `programa_id` BIGINT UNSIGNED NULL,
    `numero` VARCHAR(20) NOT NULL COMMENT 'Ej: 1, 6-7',
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NULL,
    `orden` INT NOT NULL DEFAULT 0,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `elementos_programa_id_fk` (`programa_id`),
    CONSTRAINT `elementos_programa_id_foreign` FOREIGN KEY (`programa_id`) REFERENCES `programas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: actividades
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `actividades` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `elemento_id` BIGINT UNSIGNED NOT NULL,
    `codigo` VARCHAR(20) NOT NULL COMMENT 'Ej: 1.1, 2.1',
    `descripcion` TEXT NOT NULL,
    `criterios` TEXT NULL,
    `frecuencia` ENUM('mensual', 'trimestral', 'semestral', 'anual', 'cuando_aplique') NOT NULL DEFAULT 'mensual',
    `requiere_evidencia` TINYINT(1) NOT NULL DEFAULT 0,
    `orden` INT NOT NULL DEFAULT 0,
    `activo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `actividades_elemento_id_fk` (`elemento_id`),
    CONSTRAINT `actividades_elemento_id_foreign` FOREIGN KEY (`elemento_id`) REFERENCES `elementos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: contratista_asignaciones
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `contratista_asignaciones` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a contratista principal',
    `tipo_contratista_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a tipos_contratista/servicios',
    `dependencia_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a dependencias',
    `administrador_contrato_id` BIGINT UNSIGNED NULL COMMENT 'FK a administrador asignado',
    `periodo_inicio` DATE NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `contratista_asignaciones_user_id_fk` (`user_id`),
    KEY `contratista_asignaciones_tipo_contratista_id_fk` (`tipo_contratista_id`),
    KEY `contratista_asignaciones_dependencia_id_fk` (`dependencia_id`),
    KEY `contratista_asignaciones_admin_id_fk` (`administrador_contrato_id`),
    CONSTRAINT `contratista_asignaciones_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `contratista_asignaciones_tipo_contratista_id_foreign` FOREIGN KEY (`tipo_contratista_id`) REFERENCES `tipos_contratista` (`id`) ON DELETE CASCADE,
    CONSTRAINT `contratista_asignaciones_dependencia_id_foreign` FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias` (`id`) ON DELETE CASCADE,
    CONSTRAINT `contratista_asignaciones_admin_id_foreign` FOREIGN KEY (`administrador_contrato_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: registros
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1) + DOCUMENTACION.md (Módulo 15)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `registros` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `contratista_asignacion_id` BIGINT UNSIGNED NULL,
    `periodo` DATE NOT NULL COMMENT 'Primer día del mes',
    `eecc_nombre` VARCHAR(255) NULL,
    `dependencia` VARCHAR(255) NULL,
    `personas_nuevas` INT NOT NULL DEFAULT 0,
    `supervisores` INT NOT NULL DEFAULT 0,
    `prevencionistas` INT NOT NULL DEFAULT 0,
    `dotacion_total` INT NOT NULL DEFAULT 0,
    `porcentaje_cumplimiento` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `porcentaje_cumplimiento_auditor` DECIMAL(5,2) NULL,
    `estado_auditoria` ENUM('pendiente', 'auditando', 'auditada_terreno', 'auditada_sistema', 'reabierto') NOT NULL DEFAULT 'pendiente',
    `tipo_auditoria` ENUM('sistema', 'terreno') NULL,
    `auditor_id` BIGINT UNSIGNED NULL,
    `fecha_auditoria` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `registros_user_id_fk` (`user_id`),
    KEY `registros_contratista_asignacion_id_fk` (`contratista_asignacion_id`),
    KEY `registros_auditor_id_fk` (`auditor_id`),
    KEY `registros_periodo_idx` (`periodo`),
    CONSTRAINT `registros_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `registros_contratista_asignacion_id_foreign` FOREIGN KEY (`contratista_asignacion_id`) REFERENCES `contratista_asignaciones` (`id`) ON DELETE SET NULL,
    CONSTRAINT `registros_auditor_id_foreign` FOREIGN KEY (`auditor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: registro_actividades
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1) + DOCUMENTACION.md (Módulo 17)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `registro_actividades` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `registro_id` BIGINT UNSIGNED NOT NULL,
    `actividad_id` BIGINT UNSIGNED NOT NULL,
    `cumple` TINYINT(1) NULL COMMENT 'Contratista: 1=Sí, 0=No, NULL=Sin respuesta',
    `cumple_auditor` TINYINT(1) NULL COMMENT 'Auditor: 1=Sí, 0=No, NULL=Sin auditar',
    `responsable` VARCHAR(255) NULL,
    `descripcion_contratista` TEXT NULL,
    `observacion_auditor` TEXT NULL,
    `subsanado_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de subsanación',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `registro_actividades_registro_id_fk` (`registro_id`),
    KEY `registro_actividades_actividad_id_fk` (`actividad_id`),
    CONSTRAINT `registro_actividades_registro_id_foreign` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE CASCADE,
    CONSTRAINT `registro_actividades_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: evidencias
-- Source: DOCUMENTO DE CONTEXTO (Sección 5.1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `evidencias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `registro_actividad_id` BIGINT UNSIGNED NOT NULL,
    `nombre_archivo` VARCHAR(255) NOT NULL,
    `ruta_archivo` VARCHAR(500) NOT NULL,
    `tipo_archivo` VARCHAR(50) NULL,
    `tamaño` INT UNSIGNED NULL COMMENT 'Tamaño en bytes',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `evidencias_registro_actividad_id_fk` (`registro_actividad_id`),
    CONSTRAINT `evidencias_registro_actividad_id_foreign` FOREIGN KEY (`registro_actividad_id`) REFERENCES `registro_actividades` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: configuraciones
-- Source: DOCUMENTACION.md (Módulo 8)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `configuraciones` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NULL,
    `description` VARCHAR(500) NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'string' COMMENT 'integer, string, boolean',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `configuraciones_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: solicitudes_reapertura
-- Source: DOCUMENTACION.md (Módulo 13)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `solicitudes_reapertura` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `registro_id` BIGINT UNSIGNED NOT NULL,
    `solicitante_id` BIGINT UNSIGNED NOT NULL COMMENT 'Usuario contratista que solicita',
    `motivo` TEXT NOT NULL COMMENT 'Justificación de la reapertura',
    `estado` ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
    `aprobador_id` BIGINT UNSIGNED NULL COMMENT 'Admin que resuelve la solicitud',
    `comentario_respuesta` TEXT NULL COMMENT 'Respuesta del administrador',
    `fecha_limite_subsanacion` DATE NULL COMMENT 'Plazo para subsanar (definido al aprobar)',
    `fecha_respuesta` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `solicitudes_reapertura_registro_id_fk` (`registro_id`),
    KEY `solicitudes_reapertura_solicitante_id_fk` (`solicitante_id`),
    KEY `solicitudes_reapertura_aprobador_id_fk` (`aprobador_id`),
    CONSTRAINT `solicitudes_reapertura_registro_id_foreign` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE CASCADE,
    CONSTRAINT `solicitudes_reapertura_solicitante_id_foreign` FOREIGN KEY (`solicitante_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `solicitudes_reapertura_aprobador_id_foreign` FOREIGN KEY (`aprobador_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: registro_logs
-- Source: DOCUMENTACION.md (Módulo 14)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `registro_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `registro_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL COMMENT 'Usuario que realizó la acción',
    `accion` VARCHAR(50) NOT NULL COMMENT 'crear, editar, solicitar_reapertura, aprobar_reapertura, etc.',
    `descripcion` TEXT NULL,
    `datos_anteriores` JSON NULL COMMENT 'Estado previo',
    `datos_nuevos` JSON NULL COMMENT 'Estado nuevo',
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `registro_logs_registro_id_fk` (`registro_id`),
    KEY `registro_logs_user_id_fk` (`user_id`),
    CONSTRAINT `registro_logs_registro_id_foreign` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE CASCADE,
    CONSTRAINT `registro_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: auditoria_comentarios
-- Source: DOCUMENTACION.md (Módulo 16)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `auditoria_comentarios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `registro_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Auditor que comenta',
    `comentario` TEXT NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `auditoria_comentarios_registro_id_fk` (`registro_id`),
    KEY `auditoria_comentarios_user_id_fk` (`user_id`),
    CONSTRAINT `auditoria_comentarios_registro_id_foreign` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE CASCADE,
    CONSTRAINT `auditoria_comentarios_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: hallazgos (Gestión de Brechas)
-- Source: PENDIENTES_PROYECTO.md (Sección 3)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hallazgos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `registro_id` BIGINT UNSIGNED NOT NULL,
    `registro_actividad_id` BIGINT UNSIGNED NULL,
    `auditor_id` BIGINT UNSIGNED NOT NULL,
    `descripcion` TEXT NOT NULL,
    `accion_correctiva` TEXT NULL,
    `responsable` VARCHAR(255) NULL,
    `fecha_compromiso` DATE NULL,
    `estado` ENUM('abierto', 'cerrado') NOT NULL DEFAULT 'abierto',
    `fecha_cierre` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `hallazgos_registro_id_fk` (`registro_id`),
    KEY `hallazgos_registro_actividad_id_fk` (`registro_actividad_id`),
    KEY `hallazgos_auditor_id_fk` (`auditor_id`),
    CONSTRAINT `hallazgos_registro_id_foreign` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE CASCADE,
    CONSTRAINT `hallazgos_registro_actividad_id_foreign` FOREIGN KEY (`registro_actividad_id`) REFERENCES `registro_actividades` (`id`) ON DELETE SET NULL,
    CONSTRAINT `hallazgos_auditor_id_foreign` FOREIGN KEY (`auditor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: compromisos
-- Source: Laravel Migration (2026-01-27)
-- Gestión de compromisos de contratistas
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `compromisos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `contratista_asignacion_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a contratista_asignaciones',
    `descripcion_compromiso` TEXT NOT NULL COMMENT 'Descripción del compromiso',
    `fecha_cumplimiento` DATE NULL COMMENT 'Fecha comprometida de cumplimiento',
    `estado_cumplimiento` ENUM('comprometido', 'cumple', 'no cumple') NOT NULL DEFAULT 'comprometido',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `compromisos_asignacion_id_fk` (`contratista_asignacion_id`),
    CONSTRAINT `compromisos_asignacion_id_foreign` FOREIGN KEY (`contratista_asignacion_id`) 
        REFERENCES `contratista_asignaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: privilegios
-- Source: Motor nativo de privilegios
-- Permisos granulares por rol y módulo
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `privilegios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK a roles',
    `ref_modulo` VARCHAR(255) NOT NULL COMMENT 'Nombre del módulo o * para todos',
    `read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Permiso de lectura',
    `write` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Permiso de escritura',
    `excec` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Permiso de ejecución',
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `privilegios_role_id_fk` (`role_id`),
    UNIQUE KEY `privilegios_role_modulo_unique` (`role_id`, `ref_modulo`),
    CONSTRAINT `privilegios_role_id_foreign` FOREIGN KEY (`role_id`) 
        REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default roles
INSERT INTO `roles` (`name`, `guard_name`, `created_at`, `updated_at`) VALUES
('admin', 'web', NOW(), NOW()),
('administrador_contrato', 'web', NOW(), NOW()),
('contratista', 'web', NOW(), NOW()),
('usuario_contratista', 'web', NOW(), NOW());

-- Default configuration
INSERT INTO `configuraciones` (`key`, `value`, `description`, `type`, `created_at`, `updated_at`) VALUES
('meta_programa', '85', 'Meta del programa de cumplimiento (%)', 'integer', NOW(), NOW()),
('fecha_limite_reporte', '5', 'Día hábil límite para reportar (5to día)', 'integer', NOW(), NOW()),
('evidencia_obligatoria', '0', '¿Es obligatorio subir evidencia?', 'boolean', NOW(), NOW()),
('max_evidencias_por_actividad', '4', 'Máximo de evidencias por actividad', 'integer', NOW(), NOW());
