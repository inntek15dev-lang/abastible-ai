---
name: Image to User Story
description: Analyzes UI images recursively to infer user stories with acceptance criteria and business rules
triggers: ["ui analysis request", "user story extraction", "interface documentation"]
---

# ROLE: UI TO USER STORY ANALYZER
# AUTHORITY: Operational Skill
# OBJECTIVE: Transform UI images into precise, complete user stories

## 1. MISSION
Analizar imágenes de interfaz de usuario de forma recursiva y profunda para identificar componentes, inferir operatoria, flujos posibles, y generar historias de usuario técnicamente exactas con criterios de aceptación y reglas de negocio.

## 2. INPUTS

| Input | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | file/path | Sí | Imagen de UI (PNG, JPG, WebP) |
| `context` | string | No | Contexto del sistema/dominio |
| `output_format` | string | No | `markdown` (default), `json`, `yaml` |

## 3. OUTPUTS

| Output | Ubicación | Descripción |
|--------|-----------|-------------|
| `US_{id}.md` | `.agent/user-stories/` | Historia(s) de usuario generadas |

## 4. RECURSIVE ANALYSIS PROTOCOL

### 4.1 Phase 1: Initial Scan
```
1. Identify UI type:
   - Form / Data entry
   - List / Table / Grid
   - Dashboard / Analytics
   - Navigation / Menu
   - Detail view / Card
   - Modal / Dialog
   - Wizard / Multi-step
   
2. Detect primary elements:
   - Headers / Titles
   - Input fields
   - Buttons / Actions
   - Data displays
   - Navigation elements
   - Feedback indicators
```

### 4.2 Phase 2: Component Deep Analysis
```
FOR EACH identified component:
  1. Determine component type
  2. Identify data it represents
  3. Infer possible interactions
  4. Detect validation indicators
  5. Note relationships with other components
  
  STORE analysis in component_map[]
```

### 4.3 Phase 3: Context Inference (Recursive)
```
LOOP until context_confidence >= 0.85:
  1. Analyze component relationships
  2. Infer domain/business context
  3. Propose system purpose
  4. Validate against visual evidence
  5. Refine if inconsistencies found
  
  IF iteration > 5 AND confidence < 0.7:
    FLAG for human clarification
```

### 4.4 Phase 4: Flow Identification
```
1. Identify entry points (primary actions)
2. Trace possible user paths:
   - Happy path (main flow)
   - Alternative paths
   - Error handling paths
3. Map state transitions
4. Document decision points
```

### 4.5 Phase 5: User Story Synthesis
```
FOR EACH identified flow:
  1. Determine actor (user role)
  2. Define action (what user does)
  3. Establish goal (why user does it)
  4. Extract acceptance criteria from:
     - Visible validations
     - Required fields
     - Enabled/disabled states
     - Success indicators
  5. Infer business rules from:
     - Field relationships
     - Conditional visibility
     - Data constraints
```

## 5. USER STORY FORMAT

```markdown
# US-{ID}: {Title}

## Historia de Usuario

**Como** {actor/rol}
**Quiero** {acción/funcionalidad}
**Para** {beneficio/objetivo}

## Descripción
{Descripción técnica detallada de la funcionalidad}

## Componentes de UI Identificados
| Componente | Tipo | Función |
|------------|------|---------|
| ... | ... | ... |

## Flujo Principal
1. {Paso 1}
2. {Paso 2}
...

## Flujos Alternativos
- **FA1**: {Descripción}
- **FA2**: {Descripción}

## Criterios de Aceptación

### Funcionales
- [ ] **CA-01**: {Criterio verificable}
- [ ] **CA-02**: {Criterio verificable}

### No Funcionales
- [ ] **CA-NF-01**: {Criterio de rendimiento/UX}

## Reglas de Negocio
| ID | Regla | Condición | Acción |
|----|-------|-----------|--------|
| RN-01 | {Nombre} | {Si...} | {Entonces...} |

## Validaciones Detectadas
| Campo | Validación | Mensaje Sugerido |
|-------|------------|------------------|
| ... | ... | ... |

## Dependencias
- {Lista de US relacionadas o prerequisitos}

## Notas de Análisis
- {Observaciones del proceso de inferencia}
- {Suposiciones realizadas}
- {Puntos que requieren clarificación}

---
*Generado por: img-to-user-story*
*Imagen fuente: {path}*
*Confianza del análisis: {%}*
```

## 6. CONFIDENCE SCORING

| Nivel | Rango | Significado |
|-------|-------|-------------|
| Alta | 0.85-1.0 | Análisis completo, alta certeza |
| Media | 0.70-0.84 | Análisis razonable, algunas inferencias |
| Baja | 0.50-0.69 | Requiere validación humana |
| Insuficiente | <0.50 | No se puede completar sin contexto |

## 7. INFERENCE RULES

### 7.1 Campo de Texto → Criterio de Aceptación
```
IF input.hasLabel AND input.hasPlaceholder:
  CA: El campo {label} debe aceptar {inferred_type}
  CA: El placeholder debe indicar "{placeholder}"

IF input.hasAsterisk OR input.hasRequiredIndicator:
  CA: El campo {label} es obligatorio
  RN: No se puede enviar el formulario sin {label}
```

### 7.2 Botón → Acción y Flujo
```
IF button.text IN ["Guardar", "Save", "Enviar", "Submit"]:
  FLOW: Persistencia de datos
  CA: Al hacer clic, los datos deben guardarse
  CA: Debe mostrar confirmación de éxito

IF button.text IN ["Cancelar", "Cancel", "Cerrar"]:
  FLOW: Cancelación
  CA: Debe descartar cambios no guardados
  CA: Debe solicitar confirmación si hay cambios
```

### 7.3 Tabla → CRUD Operations
```
IF table.hasRowActions:
  US: Gestión de {entity}
  CA: Debe permitir ver detalle de cada registro
  CA: Debe permitir editar registros existentes
  CA: Debe permitir eliminar con confirmación

IF table.hasFilters:
  CA: Debe filtrar resultados por {filter_fields}
  
IF table.hasPagination:
  CA: Debe paginar resultados de {n} en {n}
```

## 8. GUARDRAILS

1. **No inventar funcionalidad**: Solo inferir de evidencia visual
2. **Marcar suposiciones**: Documentar toda inferencia no evidente
3. **Recursión limitada**: Máximo 5 iteraciones de refinamiento
4. **Solicitar clarificación**: Si confianza < 0.5, pedir contexto
5. **Separar US**: Una historia por flujo principal identificado

## 9. VALIDATION CHECKLIST

Antes de output:
- [ ] Todas las US siguen formato estándar
- [ ] Criterios de aceptación son verificables
- [ ] Reglas de negocio tienen condición y acción
- [ ] Flujos tienen inicio y fin claros
- [ ] Suposiciones están documentadas
- [ ] Nivel de confianza calculado

## 10. EXAMPLE INVOCATION

```
/img-to-user-story analyze login_screen.png --context "Sistema de gestión hospitalaria"
```

Output: `.agent/user-stories/US_001_login.md`

## 11. INTEGRATIONS

| Skill | Integration |
|-------|-------------|
| `ieee-gen` | Alimentar blueprint con US generadas |
| `context-memory` | Almacenar patrones de UI reconocidos |
| `pattern-recognizer` | Mejorar inferencias con patrones previos |
