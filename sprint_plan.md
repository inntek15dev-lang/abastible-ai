# Plan de Sprint - Abastible AI

Este plan detalla las tareas pendientes y completadas basadas en los requerimientos del usuario utilizando el protocolo Agile Coach.

## Sprint Activo: Estabilización y Pulido Estético

### 1. Objetivos del Sprint
*   Corregir la lógica de visualización de registros pendientes por rol.
*   Eliminar funcionalidades obsoletas (Botón Add Empresa).
*   Resolver fallos en el reporte PDF del Dashboard.
*   Aplicar estilos globales para profesionalizar módulos específicos.

### 2. Product Backlog (Pendientes)

| ID | Requerimiento | Prioridad (MoSCoW) | Estado | Responsable |
| :--- | :--- | :--- | :--- | :--- |
| **TSK-01** | Revisar registros que se muestran en "Pendientes", no cuadran con lo que se debiera ver y está realmente pendiente para cada rol. | **MUST** | ✅ Completado | Antigravity |
| **TSK-02** | Eliminar botón "Add Empresa" en admin y cualquier rol (funcionalidad no válida). | **MUST** | ✅ Completado | Antigravity |
| **TSK-03** | Revisar y corregir el reporte PDF en Dashboard reportes. | **SHOULD** | ✅ Completado | Antigravity |
| **TSK-04** | Aplicar estilos globales al módulo de Servicios. | **COULD** | ✅ Completado | Antigravity |
| **TSK-05** | Aplicar estéticas globales para profesionalizar estética en módulo compromisos. | **COULD** | ✅ Completado | Antigravity |

---

## 3. Tareas Completadas (En este ciclo)

Estas tareas fueron solicitadas y ya se encuentran implementadas en el código (pendientes de validación en el despliegue):

| ID | Requerimiento | Estado |
| :--- | :--- | :--- |
| **DONE-01** | Definir participantes de la reunión de accounting en la vista de auditoría (tabla con nombre, rut, cargo, empresa). | ✅ Completado |
| **DONE-02** | Acotar fecha máxima de subsanación a 1 semana desde la fecha actual, bloqueando el resto. | ✅ Completado |
| **DONE-03** | Bloquear eliminación de evidencias al contratista en la etapa de subsanación. | ✅ Completado |
| **DONE-04** | Identificar visualmente las actividades modificadas durante la subsanación. | ✅ Completado |
| **DONE-05** | Cargar una evidencia de subsanación por cada evidencia previamente cargada + completar faltantes. | ✅ Completado |
| **DONE-06** | Agregar comentario directamente en el modal de confirmación de reapertura directa por admin contratos. | ✅ Completado |

---

## 4. Próximos Pasos
1.  Validar que el despliegue en Preprod sea exitoso con las correcciones de sintaxis aplicadas.
2.  Iniciar con **TSK-01** (Revisión de registros pendientes) por ser de alta prioridad.
