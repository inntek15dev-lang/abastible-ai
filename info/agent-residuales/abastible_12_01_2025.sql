oiem_abastibleoiem_abastible-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         8.4.3 - MySQL Community Server - GPL
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Volcando estructura para tabla oiem_abastible.actividades
CREATE TABLE IF NOT EXISTS `actividades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `elemento_id` bigint unsigned NOT NULL,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actividad` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `criterios` text COLLATE utf8mb4_unicode_ci,
  `frecuencia` enum('mensual','trimestral','semestral','anual','cuando_aplique') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mensual',
  `requiere_evidencia` tinyint(1) NOT NULL DEFAULT '0',
  `orden` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `actividades_elemento_id_foreign` (`elemento_id`),
  CONSTRAINT `actividades_elemento_id_foreign` FOREIGN KEY (`elemento_id`) REFERENCES `elementos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.actividades: ~0 rows (aproximadamente)
INSERT INTO `actividades` (`id`, `elemento_id`, `codigo`, `actividad`, `descripcion`, `criterios`, `frecuencia`, `requiere_evidencia`, `orden`, `activo`, `created_at`, `updated_at`) VALUES
	(1, 1, '1.1', 'Ejecución del Programa SAFEALIGN', 'Todo contacto de seguridad deberá ser planificado, según las directrices de programa safealign, y esta planificación tendrá su foco en los análisis de tendencia de accidentes. Se deberá realizar los CS, SST e IRF acorde a las metas establecidas en el programa Safealign, y de acuerdo al numero de personas que deban reportar.', 'Contactos de Seguridad (CS): 2 CS por cada jefatura o linea de supervisión que se hayan asignado.\r\nSesiones de Seguridad en el trabajo (SST): 2 SST por cada jefatura o linea de supervisión que se hayan asignado.\r\nInspección de Riesgos Físicos (IRF): 2 IRF por cada jefatura o linea de supervisión que se hayan asignado.', 'mensual', 1, 1, 1, '2025-12-16 03:33:25', '2026-01-02 17:04:11'),
	(2, 1, '1.2', 'Participación en CPHS de faena', 'La actividad corresponde a la participación activa en las reuniones y comisiones del CPHS de faena en las dependencias en las que aplique, debe existir evidencia objetiva de su participación en la reunión del mes informado, especificamente un registro de asistencia junto con el acta respectiva.', 'Registro de asistencia junto con acta respectiva', 'mensual', 0, 2, 1, '2025-12-16 03:33:25', '2026-01-02 17:04:45'),
	(3, 1, '1.3', 'Reunión de accountability', 'La actividad corresponde a la presentación de resultados correspondientes al programa +seguridad contratistas al administrador de contrato Abastible y Equipo de Integridad Operacional. La presentación se deberá realizar bajo el formato establecido por Abastible.', 'Presentación de resultados al administrador de contrato bajo formato establecido', 'mensual', 0, 3, 1, '2025-12-16 03:33:25', '2026-01-02 17:06:03'),
	(4, 2, '2.1', 'Realizar análisis de riesgos cualitativo (AST) de tarea crítica', NULL, 'AST documentado de una tarea crítica de la matriz de riesgos del Proceso de distribución granel', 'mensual', 1, 1, 1, '2025-12-16 03:33:25', '2025-12-16 23:35:57'),
	(5, 2, '2.2', 'Cumplimiento de protocolos MINSAL', NULL, '100% de cumplimiento de protocolos sanitarios vigentes', 'mensual', 1, 2, 1, '2025-12-16 03:33:25', '2025-12-17 00:09:04'),
	(6, 3, '3.1', 'Ejecución de inducciones según D.S. N°44 (Charla ODI)', NULL, '100% del personal nuevo con inducción completada', 'mensual', 0, 1, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(7, 3, '3.2', 'Cumplimiento de plan de capacitación anual', NULL, 'Avance según cronograma del plan de capacitación', 'mensual', 0, 2, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(8, 4, '4.1', 'Verificación de Check List salida y retorno de camión granel', NULL, '100% de check list digitalizados correctamente aplicados', 'mensual', 0, 1, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(9, 4, '4.2', 'Gestión de cierre de tarjetas', NULL, 'Tarjetas cerradas en plazo según procedimiento', 'mensual', 0, 2, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(10, 5, '5.1', 'Garantizar 100% de Acreditación para EECC y trabajadores', NULL, '100% del personal con acreditación vigente en Abastible', 'mensual', 0, 1, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(11, 5, '5.2', 'Verificación laboral (obligaciones laborales y previsionales)', NULL, '100% de cumplimiento en pago de obligaciones', 'mensual', 0, 2, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(12, 5, '5.3', 'Reunión de accountability mensual con resumen estadístico', NULL, 'Presentación de resumen estadístico y evidencia de cada actividad', 'mensual', 0, 3, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(13, 6, '6.1', 'Envío de informe de investigación en plazo', NULL, 'Informe enviado dentro del plazo establecido', 'cuando_aplique', 0, 1, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(14, 6, '6.2', 'Verificación del cierre de acciones correctivas', NULL, 'Acciones correctivas derivadas de investigaciones cerradas', 'mensual', 1, 2, 1, '2025-12-16 03:33:25', '2025-12-16 07:39:16'),
	(15, 7, '7.1', 'Registro de Incidentes no registrables', NULL, 'Registro actualizado de incidentes menores', 'mensual', 0, 1, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(16, 7, '7.2', 'Registro de Incidentes registrables', NULL, 'Registro actualizado de incidentes con consecuencias', 'mensual', 0, 2, 1, '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(17, 8, '4444', 'revvion de dependencias', 'se revisa las depesndencias que tengan paredes  piso , cerradas', 'debe tener piso de cemento', 'mensual', 1, 1, 1, '2025-12-29 20:32:29', '2026-01-06 01:49:51');

-- Volcando estructura para tabla oiem_abastible.cache
CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.cache: ~0 rows (aproximadamente)
INSERT INTO `cache` (`key`, `value`, `expiration`) VALUES
	('abastible-cache-spatie.permission.cache', 'a:3:{s:5:"alias";a:4:{s:1:"a";s:2:"id";s:1:"b";s:4:"name";s:1:"c";s:10:"guard_name";s:1:"r";s:5:"roles";}s:11:"permissions";a:19:{i:0;a:4:{s:1:"a";i:1;s:1:"b";s:13:"elementos.ver";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:1;a:4:{s:1:"a";i:2;s:1:"b";s:15:"elementos.crear";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:2;a:4:{s:1:"a";i:3;s:1:"b";s:16:"elementos.editar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:3;a:4:{s:1:"a";i:4;s:1:"b";s:18:"elementos.eliminar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:4;a:4:{s:1:"a";i:5;s:1:"b";s:15:"actividades.ver";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:5;a:4:{s:1:"a";i:6;s:1:"b";s:17:"actividades.crear";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:6;a:4:{s:1:"a";i:7;s:1:"b";s:18:"actividades.editar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:7;a:4:{s:1:"a";i:8;s:1:"b";s:20:"actividades.eliminar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:8;a:4:{s:1:"a";i:9;s:1:"b";s:19:"registros.ver_todos";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:9;a:4:{s:1:"a";i:10;s:1:"b";s:20:"evidencias.ver_todos";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:10;a:4:{s:1:"a";i:11;s:1:"b";s:20:"evidencias.descargar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:11;a:4:{s:1:"a";i:12;s:1:"b";s:16:"reportes.generar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:12;a:4:{s:1:"a";i:13;s:1:"b";s:18:"usuarios.gestionar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:2;}}i:13;a:4:{s:1:"a";i:14;s:1:"b";s:15:"registros.crear";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:3;}}i:14;a:4:{s:1:"a";i:15;s:1:"b";s:21:"registros.ver_propios";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:3;}}i:15;a:4:{s:1:"a";i:16;s:1:"b";s:24:"registros.editar_propios";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:3;}}i:16;a:4:{s:1:"a";i:17;s:1:"b";s:16:"evidencias.subir";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:3;}}i:17;a:4:{s:1:"a";i:18;s:1:"b";s:22:"evidencias.ver_propias";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:3;}}i:18;a:4:{s:1:"a";i:19;s:1:"b";s:20:"plantillas.descargar";s:1:"c";s:3:"web";s:1:"r";a:1:{i:0;i:3;}}}s:5:"roles";a:2:{i:0;a:3:{s:1:"a";i:2;s:1:"b";s:5:"admin";s:1:"c";s:3:"web";}i:1;a:3:{s:1:"a";i:3;s:1:"b";s:11:"contratista";s:1:"c";s:3:"web";}}}', 1768331738);

-- Volcando estructura para tabla oiem_abastible.cache_locks
CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.cache_locks: ~0 rows (aproximadamente)

-- Volcando estructura para tabla oiem_abastible.configuraciones
CREATE TABLE IF NOT EXISTS `configuraciones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `clave` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `configuraciones_clave_unique` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.configuraciones: ~0 rows (aproximadamente)
INSERT INTO `configuraciones` (`id`, `clave`, `valor`, `descripcion`, `tipo`, `created_at`, `updated_at`) VALUES
	(1, 'meta_programa', '85', 'Meta de cumplimiento del programa OIEM (%)', 'text', '2025-12-16 16:39:51', '2025-12-16 16:39:51');

-- Volcando estructura para tabla oiem_abastible.dependencias
CREATE TABLE IF NOT EXISTS `dependencias` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.dependencias: ~2 rows (aproximadamente)
INSERT INTO `dependencias` (`id`, `nombre`, `activo`, `created_at`, `updated_at`) VALUES
	(1, 'PLANTA MEJILLONES', 1, '2025-12-16 18:35:45', '2025-12-16 18:35:45'),
	(2, 'REGION DEL BIOBIO', 1, '2025-12-16 18:36:28', '2025-12-16 18:36:28');

-- Volcando estructura para tabla oiem_abastible.elementos
CREATE TABLE IF NOT EXISTS `elementos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `programa_id` bigint unsigned DEFAULT NULL,
  `numero` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `elementos_programa_id_foreign` (`programa_id`),
  CONSTRAINT `elementos_programa_id_foreign` FOREIGN KEY (`programa_id`) REFERENCES `programas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.elementos: ~0 rows (aproximadamente)
INSERT INTO `elementos` (`id`, `programa_id`, `numero`, `nombre`, `orden`, `activo`, `created_at`, `updated_at`) VALUES
	(1, 2, '1', 'Liderazgo y compromiso', 1, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(2, 2, '2', 'Evaluación del riesgo y Gestión del riesgo', 2, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(3, 2, '5', 'Competencias y capacitación del personal', 3, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(4, 2, '6-7', 'Operaciones e Integridad Mecánica', 4, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(5, 2, '9', 'Servicios de terceros', 5, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(6, 2, '10', 'Investigación de accidentes', 6, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(7, 2, '12', 'Evaluación y Mejora de la Integridad de las Operaciones', 7, 1, '2025-12-16 03:33:25', '2025-12-29 03:57:52'),
	(8, 1, '2', 'yyyyyyyyyyyyyyyyyyyyyyyyyyyy', 1, 1, '2025-12-29 20:31:55', '2025-12-29 20:31:55'),
	(9, 1, '2', 'check liost camiones', 2, 1, '2026-01-06 01:49:02', '2026-01-06 01:49:02');

-- Volcando estructura para tabla oiem_abastible.evidencias
CREATE TABLE IF NOT EXISTS `evidencias` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `registro_actividad_id` bigint unsigned NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamaño` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `evidencias_registro_actividad_id_foreign` (`registro_actividad_id`),
  CONSTRAINT `evidencias_registro_actividad_id_foreign` FOREIGN KEY (`registro_actividad_id`) REFERENCES `registro_actividades` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.evidencias: ~0 rows (aproximadamente)
INSERT INTO `evidencias` (`id`, `registro_actividad_id`, `nombre_archivo`, `ruta_archivo`, `tipo_archivo`, `tamaño`, `created_at`, `updated_at`) VALUES
	(5, 131, 'fwpl30 2c.pdf', 'evidencias/3/MB7S7tJHXG5ENzAaW4XVNPQgSzQDjklwLWCeSdRa.pdf', 'application/pdf', 203548, '2026-01-09 05:35:21', '2026-01-09 05:35:21');

-- Volcando estructura para tabla oiem_abastible.failed_jobs
CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.failed_jobs: ~0 rows (aproximadamente)

-- Volcando estructura para tabla oiem_abastible.jobs
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.jobs: ~0 rows (aproximadamente)

-- Volcando estructura para tabla oiem_abastible.job_batches
CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.job_batches: ~0 rows (aproximadamente)

-- Volcando estructura para tabla oiem_abastible.migrations
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.migrations: ~0 rows (aproximadamente)
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
	(1, '0001_01_01_000000_create_users_table', 1),
	(2, '0001_01_01_000001_create_cache_table', 1),
	(3, '0001_01_01_000002_create_jobs_table', 1),
	(4, '2025_12_15_000001_create_elementos_table', 1),
	(5, '2025_12_15_000002_create_actividades_table', 1),
	(6, '2025_12_15_000003_create_registros_table', 1),
	(7, '2025_12_15_000004_create_registro_actividades_table', 1),
	(8, '2025_12_15_000005_create_evidencias_table', 1),
	(9, '2025_12_15_000006_add_eecc_fields_to_users_table', 1),
	(10, '2025_12_15_230452_create_permission_tables', 1),
	(11, '2025_12_16_032703_add_requiere_evidencia_to_actividades_table', 1),
	(12, '2025_12_16_122808_create_configuracions_table', 1),
	(13, '2025_12_16_142056_create_dependencias_table', 1),
	(14, '2025_12_28_000001_create_programas_table', 1),
	(15, '2025_12_28_000002_add_programa_id_to_elementos', 1),
	(16, '2025_12_28_000003_add_programa_id_to_registros', 1),
	(17, '2025_12_28_000004_create_tipos_contratistas_table', 1),
	(18, '2025_12_28_000005_add_contratista_fields_to_users', 1),
	(19, '2025_12_28_000006_add_auditoria_fields_to_registros', 1),
	(20, '2025_12_28_000007_create_hallazgos_table', 1),
	(21, '2025_12_28_200000_rename_descripcion_to_actividad_in_actividades', 1),
	(22, '2025_12_29_024834_add_audit_fields_to_registro_actividades', 1),
	(23, '2025_12_29_030943_create_user_management_associations', 1),
	(24, '2026_01_05_000001_add_estado_auditoria_to_registros', 1),
	(25, '2026_01_05_000002_create_auditoria_comentarios_table', 1),
	(26, '2026_01_05_000003_add_administrador_contrato_to_users', 1),
	(27, '2026_01_05_170000_create_contratista_asignaciones_table', 1),
	(28, '2026_01_05_180000_add_dependencia_id_to_registros', 1),
	(29, '2026_01_05_190000_add_periodo_inicio_to_asignaciones', 1),
	(30, '2026_01_06_100000_add_rut_to_users_table', 1),
	(31, '2026_01_08_211229_create_solicitudes_reapertura_table', 1),
	(32, '2026_01_09_014758_add_subsanado_at_to_registro_actividades_table', 1),
	(33, '2026_01_09_031909_create_registro_logs_table', 1),
	(34, '2026_01_09_144401_add_activo_to_users_table', 1);

-- Volcando estructura para tabla oiem_abastible.model_has_permissions
CREATE TABLE IF NOT EXISTS `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.model_has_permissions: ~0 rows (aproximadamente)

-- Volcando estructura para tabla oiem_abastible.model_has_roles
CREATE TABLE IF NOT EXISTS `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.model_has_roles: ~0 rows (aproximadamente)
INSERT INTO `model_has_roles` (`role_id`, `model_type`, `model_id`) VALUES
	(1, 'App\\Models\\User', 1),
	(2, 'App\\Models\\User', 2),
	(2, 'App\\Models\\User', 3),
	(2, 'App\\Models\\User', 4),
	(3, 'App\\Models\\User', 5),
	(3, 'App\\Models\\User', 6),
	(4, 'App\\Models\\User', 8);

-- Volcando estructura para tabla oiem_abastible.password_reset_tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.password_reset_tokens: ~0 rows (aproximadamente)

-- Volcando estructura para tabla oiem_abastible.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.permissions: ~0 rows (aproximadamente)
INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
	(1, 'elementos.ver', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(2, 'elementos.crear', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(3, 'elementos.editar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(4, 'elementos.eliminar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(5, 'actividades.ver', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(6, 'actividades.crear', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(7, 'actividades.editar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(8, 'actividades.eliminar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(9, 'registros.ver_todos', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(10, 'evidencias.ver_todos', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(11, 'evidencias.descargar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(12, 'reportes.generar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(13, 'usuarios.gestionar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(14, 'registros.crear', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(15, 'registros.ver_propios', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(16, 'registros.editar_propios', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(17, 'evidencias.subir', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(18, 'evidencias.ver_propias', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07'),
	(19, 'plantillas.descargar', 'web', '2026-01-12 23:13:07', '2026-01-12 23:13:07');

-- Volcando estructura para tabla oiem_abastible.programas
CREATE TABLE IF NOT EXISTS `programas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `meta_cumplimiento` decimal(5,2) NOT NULL DEFAULT '85.00',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `programas_codigo_unique` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.programas: ~0 rows (aproximadamente)
INSERT INTO `programas` (`id`, `codigo`, `nombre`, `descripcion`, `meta_cumplimiento`, `activo`, `created_at`, `updated_at`) VALUES
	(1, 'PROG-01', 'PROGRAMA1', 'PROGRAMA1 DE EJEMPLO', 90.00, 1, '2025-12-29 03:43:36', '2026-01-09 17:37:44'),
	(2, 'OIEM-GRANEL', 'OIEM Distribución Granel', 'Programa de Operaciones Integradas de Empresas Mandatarias - Distribución de Gas Granel', 85.00, 1, '2025-12-29 03:57:52', '2025-12-29 03:57:52'),
	(3, 'PROG-02', 'PROGRAMA2', 'PROGRAMA DE EJEMPLO2', 85.00, 1, '2025-12-29 20:31:22', '2026-01-09 17:37:59');

-- Volcando estructura para tabla oiem_abastible.registros
CREATE TABLE IF NOT EXISTS `registros` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `programa_id` bigint unsigned DEFAULT NULL,
  `periodo` date NOT NULL,
  `eecc_nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dependencia` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dependencia_id` bigint unsigned DEFAULT NULL,
  `personas_nuevas` int NOT NULL DEFAULT '0',
  `supervisores` int NOT NULL DEFAULT '0',
  `prevencionistas` int NOT NULL DEFAULT '0',
  `dotacion_total` int NOT NULL DEFAULT '0',
  `porcentaje_cumplimiento` decimal(5,2) NOT NULL DEFAULT '0.00',
  `auditado` tinyint(1) NOT NULL DEFAULT '0',
  `tipo_auditoria` enum('terreno','sistema') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_auditoria` date DEFAULT NULL,
  `auditado_por` bigint unsigned DEFAULT NULL,
  `observaciones_auditoria` text COLLATE utf8mb4_unicode_ci,
  `cerrado` tinyint(1) NOT NULL DEFAULT '0',
  `estado_auditoria` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registros_user_id_periodo_unique` (`user_id`,`periodo`),
  KEY `registros_programa_id_foreign` (`programa_id`),
  KEY `registros_auditado_por_foreign` (`auditado_por`),
  KEY `registros_dependencia_id_foreign` (`dependencia_id`),
  CONSTRAINT `registros_auditado_por_foreign` FOREIGN KEY (`auditado_por`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `registros_dependencia_id_foreign` FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `registros_programa_id_foreign` FOREIGN KEY (`programa_id`) REFERENCES `programas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `registros_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.registros: ~0 rows (aproximadamente)
INSERT INTO `registros` (`id`, `user_id`, `programa_id`, `periodo`, `eecc_nombre`, `dependencia`, `dependencia_id`, `personas_nuevas`, `supervisores`, `prevencionistas`, `dotacion_total`, `porcentaje_cumplimiento`, `auditado`, `tipo_auditoria`, `fecha_auditoria`, `auditado_por`, `observaciones_auditoria`, `cerrado`, `estado_auditoria`, `created_at`, `updated_at`) VALUES
	(3, 2, 2, '2025-12-01', 'Transportes Demo SpA', 'PLANTA MEJILLONES', NULL, 0, 0, 0, 0, 87.50, 1, 'sistema', '2026-01-09', 1, NULL, 1, 'auditada', '2026-01-06 22:45:51', '2026-01-09 18:15:02'),
	(4, 2, 1, '2026-03-01', 'Transportes Demo SpA', 'PLANTA MEJILLONES', NULL, 0, 0, 0, 0, 0.00, 1, 'sistema', '2026-01-06', 1, NULL, 1, 'auditada', '2026-01-06 23:36:15', '2026-01-07 00:21:24'),
	(5, 2, 2, '2026-01-01', 'Transportes Demo SpA', 'PLANTA MEJILLONES', NULL, 0, 0, 0, 0, 87.50, 1, 'sistema', '2026-01-09', 5, NULL, 1, 'auditada', '2026-01-09 19:50:44', '2026-01-09 21:10:57');

-- Volcando estructura para tabla oiem_abastible.registro_actividades
CREATE TABLE IF NOT EXISTS `registro_actividades` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `registro_id` bigint unsigned NOT NULL,
  `actividad_id` bigint unsigned NOT NULL,
  `cumple` tinyint(1) DEFAULT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion_contratista` text COLLATE utf8mb4_unicode_ci,
  `auditado` tinyint(1) NOT NULL DEFAULT '0',
  `cumple_auditor` tinyint(1) DEFAULT NULL,
  `observacion_auditor` text COLLATE utf8mb4_unicode_ci,
  `subsanado_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registro_actividades_registro_id_actividad_id_unique` (`registro_id`,`actividad_id`),
  KEY `registro_actividades_actividad_id_foreign` (`actividad_id`),
  CONSTRAINT `registro_actividades_actividad_id_foreign` FOREIGN KEY (`actividad_id`) REFERENCES `actividades` (`id`) ON DELETE CASCADE,
  CONSTRAINT `registro_actividades_registro_id_foreign` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=164 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.registro_actividades: ~0 rows (aproximadamente)
INSERT INTO `registro_actividades` (`id`, `registro_id`, `actividad_id`, `cumple`, `responsable`, `descripcion_contratista`, `auditado`, `cumple_auditor`, `observacion_auditor`, `subsanado_at`, `created_at`, `updated_at`) VALUES
	(131, 3, 1, 0, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-09 18:14:58'),
	(132, 3, 2, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-01-06 22:45:51', '2026-01-09 06:42:37'),
	(133, 3, 3, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:39'),
	(134, 3, 4, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:49'),
	(135, 3, 5, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:50'),
	(136, 3, 6, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:52'),
	(137, 3, 7, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:53'),
	(138, 3, 8, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:55'),
	(139, 3, 9, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:28:56'),
	(140, 3, 10, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:29:00'),
	(141, 3, 11, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:29:09'),
	(142, 3, 12, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:29:11'),
	(143, 3, 13, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:29:11'),
	(144, 3, 14, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:29:13'),
	(145, 3, 15, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-06 22:45:51', '2026-01-06 23:29:13'),
	(146, 3, 16, 1, NULL, NULL, 1, 0, 'falta el certifkfkf', NULL, '2026-01-06 22:45:51', '2026-01-06 23:30:08'),
	(147, 4, 17, 1, NULL, NULL, 1, 0, 'la evidencia no es la correcta.', NULL, '2026-01-06 23:36:15', '2026-01-07 00:20:56'),
	(148, 5, 1, 1, NULL, NULL, 1, 0, 'POR FASLTA DE INFORMACION', NULL, '2026-01-09 19:50:44', '2026-01-09 21:10:51'),
	(149, 5, 2, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:50:58'),
	(150, 5, 3, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:50:59'),
	(151, 5, 4, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:01'),
	(152, 5, 5, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:02'),
	(153, 5, 6, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:04'),
	(154, 5, 7, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:06'),
	(155, 5, 8, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:08'),
	(156, 5, 9, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:08'),
	(157, 5, 10, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:09'),
	(158, 5, 11, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 21:03:56'),
	(159, 5, 12, 0, NULL, NULL, 1, 0, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:13'),
	(160, 5, 13, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:21'),
	(161, 5, 14, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:22'),
	(162, 5, 15, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:24'),
	(163, 5, 16, 1, NULL, NULL, 1, 1, NULL, NULL, '2026-01-09 19:50:44', '2026-01-09 19:51:25');

-- Volcando estructura para tabla oiem_abastible.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.roles: ~3 rows (aproximadamente)
INSERT INTO `roles` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
	(1, 'admin', 'web', '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(2, 'contratista', 'web', '2025-12-16 03:33:25', '2025-12-16 03:33:25'),
	(3, 'administrador_contrato', 'web', '2025-12-29 07:10:46', '2025-12-29 07:10:46'),
	(4, 'usuario_contratista', 'web', '2026-01-06 20:01:42', '2026-01-06 20:01:42');

-- Volcando estructura para tabla oiem_abastible.role_has_permissions
CREATE TABLE IF NOT EXISTS `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.role_has_permissions: ~0 rows (aproximadamente)
INSERT INTO `role_has_permissions` (`permission_id`, `role_id`) VALUES
	(1, 2),
	(2, 2),
	(3, 2),
	(4, 2),
	(5, 2),
	(6, 2),
	(7, 2),
	(8, 2),
	(9, 2),
	(10, 2),
	(11, 2),
	(12, 2),
	(13, 2),
	(14, 3),
	(15, 3),
	(16, 3),
	(17, 3),
	(18, 3),
	(19, 3);

-- Volcando estructura para tabla oiem_abastible.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.sessions: ~0 rows (aproximadamente)
INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
	('3UoDdIsaqyLU1QPMOXxANxKgs2DzqYFSjxAzE8sZ', 2, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', 'YTo0OntzOjY6Il90b2tlbiI7czo0MDoiRnFxb0tra0lhYUtpa0FhQmRMMjZ2SDBkcHJPbXRwWWh3VVV5MkpqNyI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NDM6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9jb250cmF0aXN0YS9kYXNoYm9hcmQiO3M6NToicm91dGUiO3M6MjE6ImNvbnRyYXRpc3RhLmRhc2hib2FyZCI7fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjI7fQ==', 1768247005),
	('onzLFT0PUtKe69YO2duzZambzb2R591j5XhQVHT9', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiZEhWdnFaaEpVVmxDN0g4aGF4cVlLYmxwZmM5cmxSQ0duVkl1dE9RdyI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9sb2dpbiI7czo1OiJyb3V0ZSI7czo1OiJsb2dpbiI7fX0=', 1768246189),
	('XoPLDcl84BwpJxH5ds6sx1B8s8gG7WgxQMDFWdld', 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoiMGtoeDhZR2Ftb2pBS25abm53alhJbVgyTlVJQzk1amJPSTFXVzVndSI7czozOiJ1cmwiO2E6MDp7fXM6OToiX3ByZXZpb3VzIjthOjI6e3M6MzoidXJsIjtzOjQwOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYWRtaW4vY29udHJhdGlzdGFzIjtzOjU6InJvdXRlIjtzOjI0OiJhZG1pbi5jb250cmF0aXN0YXMuaW5kZXgiO31zOjY6Il9mbGFzaCI7YToyOntzOjM6Im9sZCI7YTowOnt9czozOiJuZXciO2E6MDp7fX1zOjUwOiJsb2dpbl93ZWJfNTliYTM2YWRkYzJiMmY5NDAxNTgwZjAxNGM3ZjU4ZWE0ZTMwOTg5ZCI7aToxO30=', 1768247738);

-- Volcando estructura para tabla oiem_abastible.tipos_contratistas
CREATE TABLE IF NOT EXISTS `tipos_contratistas` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `programa_id` bigint unsigned DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tipos_contratistas_codigo_unique` (`codigo`),
  KEY `tipos_contratistas_programa_id_foreign` (`programa_id`),
  CONSTRAINT `tipos_contratistas_programa_id_foreign` FOREIGN KEY (`programa_id`) REFERENCES `programas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.tipos_contratistas: ~0 rows (aproximadamente)
INSERT INTO `tipos_contratistas` (`id`, `codigo`, `nombre`, `descripcion`, `programa_id`, `activo`, `created_at`, `updated_at`) VALUES
	(1, 'SVR-02', 'GRANEL', NULL, 2, 1, '2025-12-29 07:21:42', '2026-01-09 17:40:27'),
	(2, 'SRV-01', 'ENVASADO', NULL, 1, 1, '2025-12-29 07:22:09', '2026-01-09 17:40:07'),
	(3, 'SVR-03', 'TRANSPORTE CILINDROS', NULL, 3, 1, '2025-12-29 20:38:19', '2026-01-09 17:40:37');

-- Volcando estructura para tabla oiem_abastible.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eecc_nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dependencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `administrador_contrato_id` bigint unsigned DEFAULT NULL,
  `tipo_contratista_id` bigint unsigned DEFAULT NULL,
  `dependencia_id` bigint unsigned DEFAULT NULL,
  `asem_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rut` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_tipo_contratista_id_foreign` (`tipo_contratista_id`),
  KEY `users_dependencia_id_foreign` (`dependencia_id`),
  KEY `users_asem_id_index` (`asem_id`),
  KEY `users_parent_id_foreign` (`parent_id`),
  KEY `users_administrador_contrato_id_foreign` (`administrador_contrato_id`),
  CONSTRAINT `users_administrador_contrato_id_foreign` FOREIGN KEY (`administrador_contrato_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_dependencia_id_foreign` FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_tipo_contratista_id_foreign` FOREIGN KEY (`tipo_contratista_id`) REFERENCES `tipos_contratistas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla oiem_abastible.users: ~7 rows (aproximadamente)
INSERT INTO `users` (`id`, `parent_id`, `name`, `email`, `eecc_nombre`, `dependencia`, `administrador_contrato_id`, `tipo_contratista_id`, `dependencia_id`, `asem_id`, `rut`, `telefono`, `direccion`, `email_verified_at`, `password`, `activo`, `remember_token`, `created_at`, `updated_at`) VALUES
	(1, NULL, 'Administrador OIEM', 'admin@abastible.cl', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$2y$12$pSDu.LLUBG5RNeXh2nHPhe7VihAOk4pwRnA3h2YjY8ewno6ZoNCbO', 1, '0OezuWfPqvFWp2x4DeupJ0e5CnoyqW7GE4pDWFmC9I8Ny2XvNmMeeq6kNwXd', '2025-12-16 03:33:25', '2026-01-12 23:53:54'),
	(2, NULL, 'Transportes Demo SpA', 'contratista@demo.cl', 'Transportes Demo SpA', 'Planta Maipú', 5, NULL, NULL, NULL, '88.888.888-8', '5555555', 'AVENIDA UNO NORTE 123', NULL, '$2y$12$DjwdfFdvEQFQETasZ/m2fuNjtTlc5y/JewIDphXcDa3EpjjCxyci2', 1, 'KISIiLsykp9OzfN01ilBUn1ibHYDDxY3k3g4E3a0LMgN6ZmWI8nectIcHbT7', '2025-12-16 03:33:26', '2026-01-12 23:55:37'),
	(3, NULL, 'Contratista Servicios Norte', 'contratista2@demo.cl', 'Servicios Industriales Norte Ltda', 'Planta Antofagasta', NULL, NULL, NULL, NULL, '77.777.777-7', NULL, NULL, NULL, '$2y$12$L/iJSjYjsgmnotXb./yJLeaIBciCqklrloGGlvNLqgzN25BYBvgvG', 1, NULL, '2025-12-22 17:08:03', '2026-01-12 23:55:16'),
	(4, NULL, 'Contratista Logistica Sur', 'contratista3@demo.cl', 'Logistica Sur SpA', 'Planta Concepcion', NULL, NULL, NULL, NULL, '66.666.666-6', NULL, NULL, NULL, '$2y$12$6jNaXAB8ecAzP/tNfmZyxeaTaaTta3j5iVeMWu8vd5Y/8wL5oWgL2', 1, NULL, '2025-12-22 17:08:03', '2026-01-12 23:54:59'),
	(5, NULL, 'PEDRO AC', 'admin.contrato1@demo.cl', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$2y$12$IvVUObKO3/hDP9iUEd6OGOU9qIGFk47S7YQCveUR6ukpSxsuwxuZG', 1, 'bN5oNq7MKiZCbTXl383tNj2UsAUVzXdBjjpjVOg0oflNmPdiyE8IsZbdtutD', '2026-01-06 01:01:55', '2026-01-12 23:53:30'),
	(6, NULL, 'JUAN AC', 'admin.contrato2@demo.cl', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '$2y$12$ZQU1NCgSeuHLYiDrHoJ44e2cemo39rrynvC7M63IflbCiykELnhPK', 1, NULL, '2026-01-06 01:01:55', '2026-01-12 23:53:05'),
	(8, 2, 'CONTRATISTA DEMO3', 'contratista5@demo.cl', 'Transportes Demo SpA', NULL, NULL, 1, 2, NULL, NULL, NULL, NULL, NULL, '$2y$12$bJJcw9M.6EFSOzcvpEcZnu9JgS/n9zsD48L0CedrXGO9AwqpetgHa', 1, NULL, '2026-01-06 20:09:56', '2026-01-06 20:09:56');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
