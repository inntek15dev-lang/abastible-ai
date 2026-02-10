---
name: Skill Registry
description: Centralized catalog of all skills with metadata, metrics, and dependency graph
triggers: ["skill discovery", "skill lookup", "registry update", "metrics query"]
---

# ROLE: SKILL REGISTRY GUARDIAN
# AUTHORITY: Meta-Level Infrastructure
# OBJECTIVE: Maintain single source of truth for all skills in the ecosystem

## 1. MISSION
Proveer un catálogo centralizado de todos los skills del ecosistema, incluyendo metadatos, métricas de rendimiento, y grafos de dependencias. Este es el **primer punto de consulta** para cualquier operación que involucre skills.

## 2. DATA STRUCTURES

### 2.1 Registry Location
```
.agent/meta/skill-registry/
├── SKILL.md              # Este archivo
├── registry.json         # Catálogo principal
└── schemas/
    └── skill.schema.json # Validación de estructura
```

### 2.2 Skill Entry Structure
```json
{
  "id": "skill-name",           // Identificador único (kebab-case)
  "version": "1.0.0",           // Versión semántica
  "path": ".agent/skills/...",  // Ruta al SKILL.md
  "inputs": ["glob patterns"],  // Entradas esperadas
  "outputs": ["paths"],         // Salidas generadas
  "dependencies": ["skill-id"], // Skills requeridos antes
  "tags": ["categorías"],       // Etiquetas de clasificación
  "metrics": {},                // Métricas de rendimiento
  "meta": {}                    // Metadatos adicionales
}
```

## 3. OPERATIONS

### 3.1 REGISTER_SKILL
Agregar un nuevo skill al registry.

**Precondiciones:**
- El skill tiene un `SKILL.md` válido
- El `id` no existe en el registry
- Las dependencias existen en el registry

**Proceso:**
```
1. Validar estructura del SKILL.md
2. Extraer metadatos automáticamente
3. Verificar dependencias existen
4. Agregar entrada al registry.json
5. Actualizar timestamp last_updated
```

### 3.2 UPDATE_SKILL
Actualizar metadatos de un skill existente.

**Proceso:**
```
1. Verificar que skill existe
2. Incrementar versión si hay cambios estructurales
3. Actualizar campos modificados
4. Preservar métricas históricas
5. Actualizar timestamp
```

### 3.3 QUERY_SKILL
Consultar información de un skill.

**Queries soportadas:**
- Por ID: `GET skill/{id}`
- Por tag: `GET skills?tag=generator`
- Por dependencia: `GET skills?depends_on=ieee-gen`
- Todos: `GET skills`

### 3.4 RECORD_EXECUTION
Registrar una ejecución de skill (llamado por execution-logger).

**Proceso:**
```
1. Recibir resultado de ejecución
2. Actualizar metrics.total_executions++
3. Recalcular success_rate
4. Actualizar avg_execution_time_ms
5. Guardar last_execution y last_status
```

### 3.5 GET_DEPENDENCY_GRAPH
Obtener orden de ejecución basado en dependencias.

**Output:** Lista ordenada topológicamente de skills.

## 4. VALIDATION RULES

### 4.1 Schema Validation
Todo skill registrado debe cumplir con `schemas/skill.schema.json`.

### 4.2 Dependency Validation
- No se permiten dependencias circulares
- Todas las dependencias deben existir en el registry
- El orden de ejecución debe ser determinable

### 4.3 Path Validation
- `path` debe apuntar a un archivo existente
- El archivo debe ser un SKILL.md válido

## 5. INTEGRATION HOOKS

### 5.1 Pre-Execution (llamado por orchestrator)
```javascript
// Antes de ejecutar cualquier skill:
const skill = registry.getSkill('skill-id');
const deps = registry.getDependencies('skill-id');
// Verificar que deps fueron ejecutados exitosamente
```

### 5.2 Post-Execution (llamado por execution-logger)
```javascript
// Después de cada ejecución:
registry.recordExecution('skill-id', {
  status: 'success|failure|partial',
  duration_ms: 1234,
  timestamp: 'ISO'
});
```

## 6. CLI COMMANDS (Conceptuales)

```bash
# Listar todos los skills
/skills list

# Ver detalle de un skill
/skills show ieee-gen

# Ver grafo de dependencias
/skills graph

# Validar integridad del registry
/skills validate
```

## 7. METRICS EXPOSED

| Métrica | Descripción |
|---------|-------------|
| `registry.skill_count` | Total de skills registrados |
| `registry.meta_skill_count` | Total de meta-skills |
| `registry.avg_success_rate` | Tasa de éxito promedio |
| `registry.last_update` | Última actualización |

## 8. ERROR HANDLING

| Error | Causa | Acción |
|-------|-------|--------|
| `SKILL_NOT_FOUND` | ID no existe | Retornar error 404 |
| `DUPLICATE_ID` | ID ya existe | Rechazar registro |
| `CIRCULAR_DEP` | Dependencia circular | Rechazar con detalle |
| `INVALID_SCHEMA` | Skill no cumple schema | Rechazar con errores |

## 9. GUARDRAILS

1. **INMUTABILIDAD DE HISTÓRICOS:** Las métricas pasadas no se modifican, solo se agregan nuevas.
2. **VERSIONADO:** Cambios al schema incrementan versión del registry.
3. **BACKUP:** Antes de cada escritura, crear snapshot en `snapshots/`.
