# 📋 Matriz de Funcionalidades por Rol - OIEM Abastible

> **Última actualización**: 12 de enero de 2026  
> **Propósito**: Documento para que Abastible **ratifique, elimine, mueva o agregue** funcionalidades por rol.  
> **Instrucciones**: Marque con ✅ para mantener, ❌ para eliminar, 🔄 para mover a otro rol, ➕ para agregar nueva funcionalidad.

---

## 🔐 Roles del Sistema

| Rol | Código | Descripción |
|-----|--------|-------------|
| **Administrador (Dios)** | `admin` | Control total del sistema. Puede hacer TODO. |
| **Administrador de Contrato** | `administrador_contrato` | Audita registros de los contratistas asignados. |
| **Contratista** | `contratista` | Ingresa registros mensuales y gestiona su empresa. |

---

## 📊 MÓDULO 1: DASHBOARD

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 1.1 | Ver Dashboard con KPIs generales | ✅ | ☐ | |
| 1.2 | Ver cantidad total de contratistas | ✅ | ☐ | |
| 1.3 | Ver cantidad total de registros | ✅ | ☐ | |
| 1.4 | Ver cantidad total de evidencias | ✅ | ☐ | |
| 1.5 | Ver porcentaje de cumplimiento general | ✅ | ☐ | |
| 1.6 | Ver tabla de registros recientes | ✅ | ☐ | |
| 1.7 | Filtrar por EECC, Dependencia, Periodo | ✅ | ☐ | |
| 1.8 | Ver "Mis Contratistas" (vista de admin contrato) | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 1.9 | Ver Dashboard limitado a sus contratistas asignados | ✅ | ☐ | |
| 1.10 | Ver "Mis Contratistas" (solo asignados) | ✅ | ☐ | |
| 1.11 | Ver KPIs solo de sus contratistas | ✅ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 1.12 | Ver Dashboard con su cumplimiento | ✅ | ☐ | |
| 1.13 | Ver semáforo visual (verde/amarillo/rojo) | ✅ | ☐ | |
| 1.14 | Ver meta del programa | ✅ | ☐ | |
| 1.15 | Ver botón "Nuevo Registro" para el periodo actual | ✅ | ☐ | |
| 1.16 | Ver servicios/dependencias asignados | ✅ | ☐ | |

---

## 📋 MÓDULO 2: GESTIÓN DE REGISTROS

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 2.1 | Ver lista de todos los registros | ✅ | ☐ | |
| 2.2 | Filtrar por EECC | ✅ | ☐ | |
| 2.3 | Filtrar por Dependencia | ✅ | ☐ | |
| 2.4 | Filtrar por Periodo (mes/año) | ✅ | ☐ | |
| 2.5 | Filtrar por Estado de Auditoría | ✅ | ☐ | |
| 2.6 | Ordenar por columnas | ✅ | ☐ | |
| 2.7 | Ver detalle de un registro | ✅ | ☐ | |
| 2.8 | Exportar registro a PDF | ✅ | ☐ | |
| 2.9 | Ver trazabilidad (logs) del registro | ✅ | ☐ | |
| 2.10 | Exportar trazabilidad a PDF | ✅ | ☐ | |
| 2.11 | **Reabrir registro auditado** (sin solicitud) | ✅ | ☐ | ⚠️ ¿Solo admin dios? |
| 2.12 | **Eliminar registro** (para pruebas) | ✅ | ☐ | ⚠️ ¿Desactivar en producción? |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 2.13 | Ver registros solo de sus contratistas asignados | ✅ | ☐ | |
| 2.14 | Filtrar por EECC (solo sus asignados) | ✅ | ☐ | |
| 2.15 | Ver detalle de registro de sus contratistas | ✅ | ☐ | |
| 2.16 | Exportar registro a PDF | ✅ | ☐ | |
| 2.17 | Ver trazabilidad del registro | ✅ | ☐ | |
| 2.18 | **NO puede eliminar registros** | ❌ | ☐ | |
| 2.19 | **NO puede reabrir directamente** (usa aprobación solicitud) | ❌ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 2.20 | Crear nuevo registro mensual | ✅ | ☐ | |
| 2.21 | Seleccionar servicio/dependencia (si tiene varios) | ✅ | ☐ | |
| 2.22 | Marcar cumple/no cumple por actividad | ✅ | ☐ | |
| 2.23 | Agregar responsable por actividad | ✅ | ☐ | |
| 2.24 | Agregar observaciones por actividad | ✅ | ☐ | |
| 2.25 | Subir evidencias (hasta 4 por actividad) | ✅ | ☐ | |
| 2.26 | Eliminar evidencia pendiente (antes de guardar) | ✅ | ☐ | |
| 2.27 | Guardar registro (envío) | ✅ | ☐ | |
| 2.28 | Editar registro NO auditado | ✅ | ☐ | |
| 2.29 | Ver historial de sus registros | ✅ | ☐ | |
| 2.30 | Ver detalle de su registro | ✅ | ☐ | |
| 2.31 | Exportar registro a PDF | ✅ | ☐ | |
| 2.32 | Ver trazabilidad de su registro | ✅ | ☐ | |
| 2.33 | Editar registro REABIERTO (subsanación) | ✅ | ☐ | |
| 2.34 | **NO puede editar registro auditado** | ❌ | ☐ | |
| 2.35 | **NO puede eliminar registros** | ❌ | ☐ | |

---

## 🔍 MÓDULO 3: AUDITORÍA

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 3.1 | Iniciar auditoría de cualquier registro | ✅ | ☐ | |
| 3.2 | Marcar cumple/no cumple auditor por actividad | ✅ | ☐ | |
| 3.3 | Agregar observación de auditor por actividad | ✅ | ☐ | |
| 3.4 | Agregar comentarios de auditoría al registro | ✅ | ☐ | |
| 3.5 | Seleccionar tipo de auditoría (Sistema/Terreno) | ✅ | ☐ | |
| 3.6 | Finalizar auditoría | ✅ | ☐ | |
| 3.7 | Pausar y continuar auditoría después | ✅ | ☐ | |
| 3.8 | Registrar hallazgos | ✅ | ☐ | |
| 3.9 | Cambiar estado de hallazgo (abierto/cerrado) | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 3.10 | Iniciar auditoría solo de sus contratistas | ✅ | ☐ | |
| 3.11 | Marcar cumple/no cumple auditor por actividad | ✅ | ☐ | |
| 3.12 | Agregar observación de auditor por actividad | ✅ | ☐ | |
| 3.13 | Agregar comentarios de auditoría | ✅ | ☐ | |
| 3.14 | Seleccionar tipo de auditoría | ✅ | ☐ | |
| 3.15 | Finalizar auditoría | ✅ | ☐ | |
| 3.16 | Pausar y continuar auditoría después | ✅ | ☐ | |
| 3.17 | Registrar hallazgos | ✅ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 3.18 | Ver resultado de auditoría en su registro | ✅ | ☐ | |
| 3.19 | Ver comentarios del auditor | ✅ | ☐ | |
| 3.20 | Ver hallazgos registrados | ✅ | ☐ | |
| 3.21 | **NO puede auditar** | ❌ | ☐ | |

---

## 🔔 MÓDULO 4: SOLICITUDES DE REAPERTURA

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 4.1 | Ver todas las solicitudes de reapertura | ✅ | ☐ | |
| 4.2 | Filtrar solicitudes por estado (pendiente/aprobada/rechazada) | ✅ | ☐ | |
| 4.3 | Aprobar solicitud de reapertura | ✅ | ☐ | |
| 4.4 | Definir fecha límite de subsanación | ✅ | ☐ | |
| 4.5 | Rechazar solicitud con comentario | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 4.6 | Ver solicitudes solo de sus contratistas | ✅ | ☐ | |
| 4.7 | Aprobar solicitud de reapertura | ✅ | ☐ | |
| 4.8 | Definir fecha límite de subsanación | ✅ | ☐ | |
| 4.9 | Rechazar solicitud con comentario | ✅ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 4.10 | Crear solicitud de reapertura (para registro auditado) | ✅ | ☐ | |
| 4.11 | Escribir motivo de la solicitud | ✅ | ☐ | |
| 4.12 | Ver estado de sus solicitudes | ✅ | ☐ | |
| 4.13 | Ver fecha límite de subsanación (si aprobada) | ✅ | ☐ | |
| 4.14 | Recibir email cuando solicitud es resuelta | ✅ | ☐ | |
| 4.15 | **NO puede aprobar/rechazar solicitudes** | ❌ | ☐ | |

---

## 👥 MÓDULO 5: GESTIÓN DE CONTRATISTAS

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 5.1 | Ver lista de todos los contratistas | ✅ | ☐ | |
| 5.2 | Filtrar por EECC, Dependencia, Servicio | ✅ | ☐ | |
| 5.3 | **Crear nuevo contratista manualmente** | ✅ | ☐ | ⚠️ ¿Bloquear cuando ACEM esté conectado? |
| 5.4 | **Editar contratista** | ✅ | ☐ | ⚠️ ¿Deben poder editar datos maestros? |
| 5.5 | Ver detalle de contratista | ✅ | ☐ | |
| 5.6 | Agregar asignación servicio+dependencia | ✅ | ☐ | |
| 5.7 | Editar asignación (admin contrato, fecha inicio) | ✅ | ☐ | |
| 5.8 | Eliminar asignación | ✅ | ☐ | |
| 5.9 | **Asignar administrador de contrato** | ✅ | ☐ | |
| 5.10 | **Activar/Desactivar contratista** | ✅ | ☐ | |
| 5.11 | **Eliminar contratista** | ✅ | ☐ | ⚠️ ¿Ocultar este botón? |
| 5.12 | Ver usuarios asociados del contratista | ✅ | ☐ | |
| 5.13 | Agregar usuario asociado al contratista | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 5.14 | Ver solo sus contratistas asignados | ✅ | ☐ | |
| 5.15 | Ver detalle del contratista | ✅ | ☐ | |
| 5.16 | **NO puede crear contratistas** | ❌ | ☐ | |
| 5.17 | **NO puede editar contratistas** | ❌ | ☐ | |
| 5.18 | **NO puede eliminar contratistas** | ❌ | ☐ | |
| 5.19 | **NO puede cambiar asignaciones** | ❌ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 5.20 | Ver sus propios datos | ✅ | ☐ | |
| 5.21 | **Crear usuarios asociados (operativos)** | ✅ | ☐ | ⚠️ ¿Solo contratista o también admin? |
| 5.22 | Editar usuarios asociados | ✅ | ☐ | |
| 5.23 | Eliminar usuarios asociados | ✅ | ☐ | |
| 5.24 | Asignar servicio/dependencia a usuario operativo | ✅ | ☐ | |
| 5.25 | **NO puede editar sus datos maestros** | ❌ | ☐ | Los datos vienen de ACEM |
| 5.26 | **NO puede ver otros contratistas** | ❌ | ☐ | |

---

## 👤 MÓDULO 6: GESTIÓN DE USUARIOS ABASTIBLE

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 6.1 | Ver lista de usuarios admin/admin_contrato | ✅ | ☐ | |
| 6.2 | Filtrar por rol | ✅ | ☐ | |
| 6.3 | Buscar por nombre/email | ✅ | ☐ | |
| 6.4 | Crear nuevo usuario admin | ✅ | ☐ | |
| 6.5 | Crear nuevo usuario admin_contrato | ✅ | ☐ | |
| 6.6 | Editar usuario | ✅ | ☐ | |
| 6.7 | Cambiar contraseña de usuario | ✅ | ☐ | |
| 6.8 | Cambiar rol de usuario | ✅ | ☐ | |
| 6.9 | Eliminar usuario | ✅ | ☐ | |
| 6.10 | Activar/Desactivar usuario | ✅ | ☐ | |
| 6.11 | Ver contratistas asignados a un admin_contrato | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 6.12 | **NO puede ver lista de usuarios Abastible** | ❌ | ☐ | |
| 6.13 | **NO puede crear usuarios** | ❌ | ☐ | |
| 6.14 | Editar su propio perfil | ✅ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 6.15 | **NO tiene acceso a este módulo** | ❌ | ☐ | |

---

## 📚 MÓDULO 7: PROGRAMAS, ELEMENTOS Y ACTIVIDADES

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 7.1 | Ver lista de programas | ✅ | ☐ | |
| 7.2 | Crear nuevo programa | ✅ | ☐ | |
| 7.3 | Editar programa | ✅ | ☐ | |
| 7.4 | Eliminar programa | ✅ | ☐ | |
| 7.5 | Ver elementos de un programa | ✅ | ☐ | |
| 7.6 | Crear nuevo elemento | ✅ | ☐ | |
| 7.7 | Editar elemento | ✅ | ☐ | |
| 7.8 | Eliminar elemento | ✅ | ☐ | |
| 7.9 | Ver actividades de un elemento | ✅ | ☐ | |
| 7.10 | Crear nueva actividad | ✅ | ☐ | |
| 7.11 | Editar actividad (criterios, frecuencia, etc.) | ✅ | ☐ | |
| 7.12 | Eliminar actividad | ✅ | ☐ | |
| 7.13 | Marcar actividad como requiere evidencia | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 7.14 | Ver programas (solo lectura) | ✅ | ☐ | |
| 7.15 | Ver elementos (solo lectura) | ✅ | ☐ | |
| 7.16 | Ver actividades (solo lectura) | ✅ | ☐ | |
| 7.17 | **NO puede crear/editar/eliminar** | ❌ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 7.18 | Ver actividades de su programa (en formulario) | ✅ | ☐ | |
| 7.19 | Ver criterios de aprobación | ✅ | ☐ | |
| 7.20 | **NO puede editar programas/elementos/actividades** | ❌ | ☐ | |

---

## 🏭 MÓDULO 8: SERVICIOS (Tipos de Contratista)

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 8.1 | Ver lista de servicios | ✅ | ☐ | |
| 8.2 | Crear nuevo servicio | ✅ | ☐ | |
| 8.3 | Editar servicio | ✅ | ☐ | |
| 8.4 | Asignar programa al servicio | ✅ | ☐ | |
| 8.5 | Eliminar servicio | ✅ | ☐ | |
| 8.6 | Activar/Desactivar servicio | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 8.7 | Ver lista de servicios (solo lectura) | ✅ | ☐ | |
| 8.8 | **NO puede crear/editar/eliminar servicios** | ❌ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 8.9 | Ver sus servicios asignados | ✅ | ☐ | |
| 8.10 | **NO puede acceder a este módulo** | ❌ | ☐ | |

---

## 🏢 MÓDULO 9: DEPENDENCIAS

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 9.1 | Ver lista de dependencias | ✅ | ☐ | |
| 9.2 | Crear nueva dependencia | ✅ | ☐ | ⚠️ ¿Bloquear cuando ACEM esté conectado? |
| 9.3 | Editar dependencia | ✅ | ☐ | |
| 9.4 | Eliminar dependencia | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 9.5 | Ver dependencias (solo lectura) | ✅ | ☐ | |
| 9.6 | **NO puede crear/editar/eliminar** | ❌ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 9.7 | **NO tiene acceso a este módulo** | ❌ | ☐ | |

---

## 📎 MÓDULO 10: EVIDENCIAS

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 10.1 | Ver lista consolidada de todas las evidencias | ✅ | ☐ | |
| 10.2 | Visualizar evidencia en navegador | ✅ | ☐ | |
| 10.3 | Descargar evidencia | ✅ | ☐ | |
| 10.4 | Filtrar evidencias | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 10.5 | Ver evidencias de sus contratistas | ✅ | ☐ | |
| 10.6 | Visualizar evidencia en navegador | ✅ | ☐ | |
| 10.7 | Descargar evidencia | ✅ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 10.8 | Ver sus propias evidencias | ✅ | ☐ | |
| 10.9 | Subir evidencia (hasta 4 por actividad) | ✅ | ☐ | |
| 10.10 | Visualizar evidencia en navegador | ✅ | ☐ | |
| 10.11 | Descargar evidencia | ✅ | ☐ | |
| 10.12 | Eliminar evidencia (antes de auditoría) | ✅ | ☐ | |



---

## 📈 MÓDULO 11: REPORTES

### Administrador (`admin`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 11.1 | Ver reportes consolidados | ✅ | ☐ | |
| 11.2 | Filtrar por periodo, EECC, dependencia | ✅ | ☐ | |
| 11.3 | Exportar a Excel | ✅ | ☐ | |
| 11.4 | Exportar a PDF | ✅ | ☐ | |

### Administrador de Contrato (`administrador_contrato`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 11.5 | Ver reportes de sus contratistas | ✅ | ☐ | |
| 11.6 | Exportar a Excel | ✅ | ☐ | |
| 11.7 | Exportar a PDF | ✅ | ☐ | |

### Contratista (`contratista`)

| # | Funcionalidad | Actual | ¿Mantener? | Observaciones |
|---|---------------|:------:|:----------:|---------------|
| 11.8 | **NO tiene acceso a reportes consolidados** | ❌ | ☐ | Solo ve sus propios registros |

---

## 🔔 MÓDULO 12: NOTIFICACIONES POR EMAIL

| # | Evento | Destinatario | Actual | ¿Mantener? |
|---|--------|--------------|:------:|:----------:|
| 12.1 | Solicitud de reapertura creada | Admin de Contrato asignado | ✅ | ☐ |
| 12.2 | Solicitud de reapertura aprobada | Contratista solicitante | ✅ | ☐ |
| 12.3 | Solicitud de reapertura rechazada | Contratista solicitante | ✅ | ☐ |
| 12.4 | Auditoría completada | (Pendiente) | ❌ | ☐ |
| 12.5 | Fecha límite de subsanación próxima | (Pendiente) | ❌ | ☐ |
| 12.6 | Nuevo registro enviado | (Pendiente) | ❌ | ☐ |

---

## 🛡️ RESUMEN DE RESTRICCIONES POR ROL

| Restricción | Admin | Admin Contrato | Contratista |
|-------------|:-----:|:--------------:|:-----------:|
| Crear contratistas | ✅ | ❌ | ❌ |
| Editar contratistas | ✅ | ❌ | ❌ |
| Eliminar contratistas | ✅ | ❌ | ❌ |
| Crear usuarios Abastible | ✅ | ❌ | ❌ |
| Crear usuarios propios (operativos) | ❌ | ❌ | ✅ |
| Auditar registros | ✅ | ✅ (solo asignados) | ❌ |
| Aprobar reaperturas | ✅ | ✅ (solo asignados) | ❌ |
| Reabrir directamente (sin solicitud) | ✅ | ❌ | ❌ |
| Eliminar registros | ✅ | ❌ | ❌ |
| CRUD Programas/Elementos/Actividades | ✅ | ❌ | ❌ |
| CRUD Servicios | ✅ | ❌ | ❌ |
| CRUD Dependencias | ✅ | ❌ | ❌ |
| Ver todos los contratistas | ✅ | ❌ (solo asignados) | ❌ |
| Ver todos los registros | ✅ | ❌ (solo asignados) | ❌ (solo propios) |

---

## ⚠️ DECISIONES REQUERIDAS DE ABASTIBLE

Por favor marque su decisión en cada item:

### Creación/Edición de Contratistas
- [ ] **5.3**: ¿Bloquear creación manual cuando ACEM esté conectado?
- [ ] **5.4**: ¿Permitir edición de datos maestros del contratista en OIEM?
- [ ] **5.11**: ¿Mostrar botón "Eliminar Contratista" o ocultarlo?

### Creación de Usuarios
- [ ] **5.21**: ¿Quién crea los usuarios operativos del contratista?
  - [ ] El mismo contratista
  - [ ] Solo el Admin de Contrato
  - [ ] Solo el Admin (Dios)

### Registros
- [ ] **2.11**: ¿Solo Admin (Dios) puede reabrir directamente sin solicitud?
- [ ] **2.12**: ¿Desactivar botón "Eliminar Registro" en producción?

### Evidencias
- [ ] ¿Es obligatorio subir evidencia para enviar un registro?
  - [ ] Sí, obligatorio para todas las actividades
  - [ ] Sí, solo para actividades marcadas como "requiere evidencia"
  - [ ] No, es opcional

### Dependencias
- [ ] **9.2**: ¿Bloquear creación de dependencias cuando ACEM esté conectado?

### Notificaciones Email
- [ ] **12.4**: ¿Implementar email cuando auditoría es completada?
- [ ] **12.5**: ¿Implementar email de recordatorio de fecha límite?
- [ ] **12.6**: ¿Implementar email cuando contratista envía registro?

---

> **Nota**: Este documento debe ser revisado y firmado por Abastible antes de proceder con los ajustes finales.
>
> **Contacto para dudas**: Marcos Alarcón - Desarrollo
