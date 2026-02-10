# US-051: Estructura de Navegación Global y Modular

## Historia de Usuario

**Como** Usuario del Sistema (Todos los roles)
**Quiero** navegar intuitivamente entre los distintos módulos funcionales del sistema (Resumen, Operaciones, Personas, etc.)
**Para** acceder rápidamente a las herramientas específicas de mi rol sin perder el contexto de trabajo.

## Descripción
El sistema debe implementar una navegación jerárquica basada en **Módulos Principales** (Tabs Superiores) y **Sub-menús contextuales**. La navegación debe ser consistente en toda la aplicación, destacando el módulo activo y permitiendo el acceso rápido a las funcionalidades clave mediante menús desplegables (Dropdowns) o barras de navegación secundarias.

## Componentes de UI Identificados
| Componente | Tipo | Función |
|------------|------|---------|
| **Barra de Módulos** | Nav Pills / Tabs | Contenedor principal de los 5 módulos clave. Ubicado en el Header. |
| **Módulo Resumen** | Tab Item | Acceso a Dashboards y KRIs globales. (Color: Azul Cielo) |
| **Módulo Operaciones** | Tab Item w/ Dropdown | Núcleo de auditoría: Registros, Evidencias, Solicitudes, Compromisos. (Color: Naranja) |
| **Módulo Personas** | Tab Item w/ Dropdown | Gestión de dotación y recursos humanos. (Color: Verde) |
| **Módulo Configuración** | Tab Item w/ Dropdown | Maestros: Programas, Elementos, Actividades. (Color: Púrpura) |
| **Módulo Seguridad** | Tab Item w/ Dropdown | Usuarios, Roles y Logs. (Color: Rojo) |
| **Indicador Activo** | Visual State | Cambio de color sólido + texto blanco para módulo seleccionado. |
| **Menú Flotante** | Dropdown | Lista de sub-opciones que aparece al hacer hover/click en un módulo. |

## Estructura de Navegación (Site Map)

### 1. 📊 Resumen (Blue)
*   **Monitor Global**: KPIs de cumplimiento por contrato.
*   **Mi Gestión**: KPIs específicos del usuario logueado.

### 2. 👷 Operaciones (Orange)
*   **Registros**: Gestión mensual de cumplimiento (US-050).
*   **Evidencias**: Auditoría de evidencias obligatorias (US-005).
*   **Solicitudes de Apertura**: Flujo de reaperturas (US-004).
*   **Compromisos**: Seguimiento de hallazgos y planes de acción (US-010).
*   **Historial**: Trazabilidad completa de cambios.

### 3. 👥 Personas (Green)
*   **Dotación**: Registro de trabajadores por contrato.
*   **Turnos**: Asignación de turnos.
*   **Capacitaciones**: Registro de cursos y certificaciones.

### 4. ⚙️ Configuración (Purple)
*   **Programas**: Estructura PGE (Elementos/Actividades).
*   **Empresas**: ABM de Contratistas y Mandantes.
*   **Recursos**: Tipos, Dependencias, Períodos.

### 5. 🛡️ Seguridad (Red)
*   **Usuarios**: Gestión de cuentas y accesos.
*   **Roles y Permisos**: Matriz de privilegios.
*   **Auditoría de Sistema**: Logs técnicos.

## Criterios de Aceptación

### Funcionales
- [ ] **CA-01**: El menú principal debe estar siempre visible en la parte superior (Sticky/Fixed).
- [ ] **CA-02**: Al cambiar de módulo, el color del tab debe cambiar según el código de color definido (Skin Abastible).
- [ ] **CA-03**: Los sub-menús deben desplegarse al pasar el mouse (Desktop) o al hacer click (Touch).
- [ ] **CA-04**: El sistema debe recordar el módulo activo y mantenerlo resaltado al navegar entre sub-páginas internas.
- [ ] **CA-05**: Los usuarios con rol "Contratista" NO deben ver los módulos "Configuración" ni "Seguridad" (o verlos restringidos).

### No Funcionales
- [ ] **CA-NF-01**: La transición entre módulos debe ser instantánea (< 100ms visualmente).
- [ ] **CA-NF-02**: El menú debe colapsar en un menú "Hamburguesa" en dispositivos móviles (< 768px).

## Reglas de Negocio
| ID | Regla | Condición | Acción |
|----|-------|-----------|--------|
| RN-01 | Segregación de Roles | Si Usuario = Contratista | Ocultar "Seguridad" y "Configuración". |
| RN-02 | Contexto de Empresa | Si Usuario = Contratista | Todas las vistas navegadas heredan el filtro de su Empresa ID. |

## Dependencias
- US-050: Dashboard Operations utilizará esta navegación.
- Skin Abastible: Provee los colores y estilos (Pills).

---
*Generado por: img-to-user-story*
*Imágenes fuente: menu-1.png ... menu-5.png*
*Confianza del análisis: 98% (Muy Alta)*
