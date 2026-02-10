# US-052: Visualización de Trazabilidad y Logs

## Historia de Usuario

**Como** Auditor o Administrador de Contrato
**Quiero** visualizar el historial completo de cambios (trazabilidad) de un Registro o Entidad
**Para** auditar quién modificó qué, cuándo y desde dónde, asegurando la integridad de la información.

## Descripción
El sistema debe proporcionar una vista detallada cronológica (Timeline) de todas las acciones realizadas sobre un registro específico. Esta vista debe ser accesible desde el listado de registros o desde el detalle del mismo. Debe mostrar cambios de estado, ediciones de campos críticos (dotación) y notas agregadas.

## Componentes de UI Identificados
| Componente | Tipo | Función |
|------------|------|---------|
| **Modal / Panel Lateral** | Drawer/Modal | Contenedor de la vista de trazabilidad para no perder contexto. |
| **Timeline Vertical** | List | Eje cronológico que agrupa eventos por fecha/hora descenciente. |
| **Tarjeta de Evento** | Card | Bloque que resume un evento individual. |
| **Avatar de Usuario** | Image/Icon | Identificación visual de quién realizó la acción. |
| **Etiqueta de Acción** | Badge | Tipo de acción: "CREADO", "EDITADO", "AUDITADO", "REABIERTO". |
| **Diff Visual** | Text Block | Muestra valores PREVIO vs NUEVO (ej. Dotación: 10 -> 12). |
| **Metadatos** | Text | Fecha, Hora, IP, Dispositivo (si aplica). |

## Flujo Principal
1. El usuario selecciona la acción "Traza" en un registro de la tabla (US-050).
2. Se despliega un Panel Lateral derecho con el título "Historial del Registro #ID".
3. El sistema carga los `RegistroLog` asociados.
4. El usuario hace scroll para ver la historia desde el más reciente al más antiguo.
5. El usuario cierra el panel para volver a la tabla.

## Criterios de Aceptación

### Funcionales
- [ ] **CA-01**: Debe mostrar el nombre del usuario y su rol en cada evento.
- [ ] **CA-02**: Debe diferenciar visualmente los tipos de eventos (Colores para Create/Update/Delete).
- [ ] **CA-03**: Para eventos de "EDICIÓN", debe mostrar explícitamente qué campos cambiaron (Old Value -> New Value).
- [ ] **CA-04**: Debe registrar cambios de estado de auditoría (ej. de "Pendiente" a "Auditado").

### No Funcionales
- [ ] **CA-NF-01**: La carga del historial debe ser asíncrona (Lazy loading si son muchos eventos).
- [ ] **CA-NF-02**: El diseño debe ser compacto para caber en un panel lateral (aprox 400px width).

## Reglas de Negocio
| ID | Regla | Condición | Acción |
|----|-------|-----------|--------|
| RN-01 | Inmutabilidad | Siempre | Los logs de trazabilidad NO pueden ser editados ni eliminados por nadie. |
| RN-02 | Visibilidad | Si Usuario = Contratista | Solo puede ver sus propios logs (o una versión simplificada). |

## Estructura de Datos (Referencia)
Se utilizará la entidad `RegistroLog` existente:
- `registro_id`
- `user_id`
- `accion` (Enum)
- `datos_anteriores` (JSON)
- `datos_nuevos` (JSON)
- `created_at`

---
*Generado por: img-to-user-story*
*Imagen fuente: c:\laragon\www\abastible-ai\info\trazabilidad-abastible.png*
*Confianza del análisis: 96%*
