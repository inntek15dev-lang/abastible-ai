# US-050: Dashboard de Gestión de Registros Mensuales

## Historia de Usuario

**Como** Administrador de Contrato / Auditor
**Quiero** visualizar y gestionar el listado de registros mensuales de cumplimiento
**Para** monitorear el desempeño de las empresas contratistas y ejecutar acciones de auditoría

## Descripción
El sistema debe presentar un dashboard centralizado que permita filtrar, visualizar y gestionar los registros de cumplimiento mensuales enviados por las empresas contratistas. Esta vista actúa como el punto de entrada principal para las operaciones de auditoría (PGE).

## Componentes de UI Identificados
| Componente | Tipo | Función |
|------------|------|---------|
| **Navegación Principal** | Tabs | Permitir cambio entre módulos (Resumen, Operaciones, Personas, etc.) |
| **Sub-menú Operaciones** | Dropdown/Tabs | Acceso rápido a Registros (Activo), Evidencias, Compromisos, etc. |
| **Barra de Filtros** | Form Group | Filtrar la tabla de resultados por múltiples criterios |
| **Buscador Texto** | Input Text | Búsqueda difusa por Nombre de Empresa o RUT |
| **Selectores** | Dropdown | Filtros estructurados: Servicio, Programa, Estado Auditoría, Admin Contrato |
| **Selector Periodo** | Date Picker | Rango de fechas (Mes/Año) |
| **Tabla de Resultados** | Data Grid | Visualización tabular de los registros encontrados |
| **Botones de Acción** | Button Group | Acciones por fila: Auditar, Descargar PDF, Ver Trazabilidad |
| **Indicadores Estado** | Badges | Visualización rápida de % Cumplimiento y Estado Auditoría |

## Flujo Principal (Auditoría)
1. El usuario accede al módulo "Operaciones" -> "Registros".
2. El sistema lista los registros más recientes (ej. Mes actual).
3. El usuario utiliza los filtros (ej. "Auditoría: Pendiente") para acotar la búsqueda.
4. El sistema actualiza la tabla mostrando solo los registros coincidentes.
5. El usuario identifica un registro con estado "Pendiente" (Badge Amarillo).
6. El usuario hace clic en el botón "Auditar" (Verde).
7. El sistema redirige a la vista de Auditoría (Detalle del Registro).

## Flujos Alternativos
- **FA1: Descarga de Reporte**: En lugar de auditar, el usuario presiona "PDF". El sistema genera y descarga el reporte consolidado del registro.
- **FA2: Consulta de Trazabilidad**: El usuario presiona "Traza". El sistema muestra un historial de cambios del registro (modal o vista).
- **FA3: Sin Resultados**: Si los filtros no arrojan coincidencias, la tabla muestra un estado vacío ("No se encontraron registros").

## Criterios de Aceptación

### Funcionales
- [ ] **CA-01**: La tabla debe mostrar las columnas: Mes, Contratista, RUT, Servicio, Dependencia, Dotación, % Contratista, % Auditoría, % Promedio, Fecha Envío, Estado.
- [ ] **CA-02**: Los porcentajes (% Contratista, % Auditoría) deben tener un código de color semántico (Rojo < 70%, Amarillo < 90%, Verde > 90%).
- [ ] **CA-03**: El botón "Auditar" debe estar habilitado solo si el usuario tiene permisos de escritura/auditoría.
- [ ] **CA-04**: El filtro de texto debe buscar coincidencias parciales en Nombre Contratista y RUT.
- [ ] **CA-05**: El filtro "Periodo" debe permitir seleccionar al menos Mes y Año.

### No Funcionales
- [ ] **CA-NF-01**: La búsqueda debe retornar resultados en menos de 1 segundo.
- [ ] **CA-NF-02**: La tabla debe ser responsiva o permitir scroll horizontal en pantallas pequeñas.
- [ ] **CA-NF-03**: Los colores de los badges deben cumplir con estándares de accesibilidad WCAG.

## Reglas de Negocio
| ID | Regla | Condición | Acción |
|----|-------|-----------|--------|
| RN-01 | Visibilidad por Rol | Si el usuario es "Contratista" | Solo puede ver sus propios registros (Filtro Contratista bloqueado o implícito) |
| RN-02 | Estado Pendiente | Si estado auditoría es "Pendiente" | Mostrar badge amarillo y habilitar acción "Auditar" |
| RN-03 | Registro Cerrado | Si estado es "Cerrado" | Botón auditar cambia a "Ver" (solo lectura) |

## Validaciones Detectadas
| Campo | Validación | Mensaje Sugerido |
|-------|------------|------------------|
| Buscador | Alfanumérico | N/A (Filtrado en tiempo real o on-enter) |
| Periodo | Formato Fecha | "Seleccione un periodo válido" |

## Dependencias
- US-002: Crear registros mensuales (Pre-requisito para listar)
- US-003: Auditar registros (Destino del flujo principal)

## Notas de Análisis
- Se infiere que "Servicio" y "Programa" son dimensiones clave para agrupar contratistas.
- Los tabs superiores sugieren una arquitectura modular (Personas, Configuración separados de la operación diaria).
- La presencia de "Traza" sugiere un requerimiento fuerte de auditabilidad/log de cambios.

---
*Generado por: img-to-user-story*
*Imagen fuente: c:\laragon\www\abastible-ai\info\skin-abastible.png*
*Confianza del análisis: 95% (Alta)*
