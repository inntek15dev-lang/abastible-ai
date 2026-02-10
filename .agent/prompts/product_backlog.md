# 📋 Product Backlog - OIEM Abastible

> Generado por Agile Coach siguiendo metodología MoSCoW
> Fecha: 2026-02-06

---

## 🔴 MUST - Sprint 1 (MVP)

### Epic: Autenticación y Seguridad
- [ ] **US-006** Como Administrador, quiero gestionar usuarios y asignar roles
  - AC: Crear usuarios admin y admin_contrato
  - AC: Asignar contratistas a admin_contrato
  - AC: Activar/desactivar usuarios
  - AC-SEC: Contraseñas con bcrypt

### Epic: Estructura de Programas
- [ ] **US-001** Como Administrador, quiero crear y gestionar Programas con sus Elementos y Actividades
  - AC: Crear programa con código, nombre, meta y descripción
  - AC: Agregar elementos con número, nombre y orden
  - AC: Agregar actividades con código, descripción, criterios y frecuencia
  - AC: Marcar actividades que requieren evidencia
  - AC-SEC: Solo rol admin puede realizar estas acciones

### Epic: Registros Mensuales
- [ ] **US-002** Como Contratista, quiero crear un registro mensual para mis servicios/dependencias asignados
  - AC: Seleccionar periodo (mes/año) y asignación
  - AC: Marcar cumple/no cumple por actividad
  - AC: Agregar responsable y observaciones por actividad
  - AC: Subir evidencia (obligatorio)
  - AC: Editar registro mientras no esté auditado
  - AC-SEC: Solo veo mis propios registros

### Epic: Usuarios Operativos
- [ ] **US-007** Como Contratista Admin, quiero crear usuarios operativos para mi empresa
  - AC: Crear usuarios con rol contratista_user
  - AC: Asignarles servicio y dependencia específicos
  - AC: Usuario operativo solo ve registros de su asignación
  - AC-SEC: No puedo crear usuarios admin

---

## 🟡 SHOULD - Sprint 2 (Auditoría)

### Epic: Proceso de Auditoría
- [ ] **US-003** Como Administrador de Contrato, quiero auditar los registros de mis contratistas asignados
  - AC: Ver solo registros de contratistas asignados
  - AC: Marcar cumple_auditor por actividad
  - AC: Agregar observación de auditor
  - AC: Seleccionar tipo auditoría: sistema o terreno
  - AC: Pausar y continuar auditoría después
  - AC: Registrar hallazgos con acción correctiva
  - AC-SEC: No puedo auditar contratistas no asignados

### Epic: Evidencias
- [ ] **US-005** Como Contratista, debo subir evidencias para todas las actividades
  - AC: Subir hasta 4 archivos por actividad
  - AC: Ver, descargar y eliminar evidencias (antes de auditoría)
  - AC-SEC: Solo veo mis propias evidencias

### Epic: Compromisos
- [ ] **US-010** Como Auditor, quiero registrar compromisos para contratistas
  - AC: Crear compromiso con descripción y fecha
  - AC: Cambiar estado: comprometido/cumple/no cumple
  - AC: El contratista puede ver sus compromisos
  - AC-SEC: Solo auditores pueden crear compromisos

---

## 🟡 SHOULD - Sprint 3 (Reaperturas)

### Epic: Solicitudes de Reapertura
- [ ] **US-004** Como Contratista, quiero solicitar reapertura de un registro auditado
  - AC: Crear solicitud con motivo para registro auditado
  - AC: Ver estado de mis solicitudes (pendiente/aprobada/rechazada)
  - AC: Si aprobada, tengo fecha límite de subsanación
  - AC: Recibir email cuando la solicitud es resuelta
  - AC-SEC: No puedo aprobar/rechazar solicitudes

- [ ] **US-005b** Como Administrador de Contrato, quiero aprobar o rechazar solicitudes de reapertura
  - AC: Ver solicitudes de mis contratistas asignados
  - AC: Aprobar definiendo fecha límite
  - AC: Rechazar con comentario
  - AC: Reabrir directamente sin solicitud
  - AC-SEC: Solo veo solicitudes de contratistas asignados

### Epic: Notificaciones
- [ ] Implementar emails automáticos
  - Auditoría completada
  - Recordatorio fecha límite
  - Envío de registro

---

## 🟢 COULD - Sprint 4 (Reportes)

### Epic: Dashboard
- [ ] **US-008** Como Administrador, quiero ver un dashboard con KPIs generales
  - AC: Ver total de contratistas activos
  - AC: Ver total de registros por periodo
  - AC: Ver porcentaje de cumplimiento general
  - AC: Filtrar por EECC, dependencia, periodo
  - AC-SEC: Solo usuarios autenticados acceden

### Epic: Exportación
- [ ] **US-009** Como Usuario Autenticado, quiero exportar registros y trazabilidad a PDF
  - AC: Exportar detalle de registro a PDF
  - AC: Exportar trazabilidad (log) a PDF
  - AC: El PDF incluye todos los campos relevantes
  - AC-SEC: Solo exporto registros que puedo ver

---

## ⚪ WON'T (Fuera de Scope Inicial)

- Integración con ACEM (carga automática contratistas)
- Integración con SAP
- App Móvil
- Modo Offline
- Multi-idioma

---

## Métricas de Progreso

| Sprint | Stories | Points | Status |
|--------|---------|--------|--------|
| Sprint 1 | 4 | 21 | 📅 Pendiente |
| Sprint 2 | 3 | 13 | 📅 Pendiente |
| Sprint 3 | 3 | 8 | 📅 Pendiente |
| Sprint 4 | 2 | 8 | 📅 Pendiente |

**Total: 12 User Stories | 50 Story Points**
