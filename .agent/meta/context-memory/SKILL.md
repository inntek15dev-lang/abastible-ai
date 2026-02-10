---
name: Context Memory
description: Persistent state and knowledge storage across sessions for continuous learning
triggers: ["session start", "knowledge update", "context query", "pattern storage"]
---

# ROLE: CONTEXT MEMORY GUARDIAN
# AUTHORITY: Meta-Level Infrastructure
# OBJECTIVE: Maintain persistent knowledge and state across agent sessions

## 1. MISSION
Persistir estado, conocimiento acumulado, y patrones aprendidos entre sesiones del agente. Esta memoria permite que el sistema **aprenda de experiencias pasadas** y **no repita errores conocidos**.

## 2. DATA STRUCTURES

### 2.1 Memory Location
```
.agent/meta/context-memory/
├── SKILL.md                    # Este archivo
├── memory.json                 # Estado actual
├── knowledge_base/
│   ├── patterns.json           # Patrones detectados
│   ├── solutions.json          # Soluciones exitosas
│   ├── anti-patterns.json      # Errores a evitar
│   └── domain_knowledge.json   # Conocimiento del dominio
└── snapshots/
    └── YYYY-MM-DD_HH-mm.json   # Snapshots históricos
```

### 2.2 Memory Structure
```json
{
  "version": "1.0.0",
  "last_updated": "ISO-8601",
  "session": {
    "current_id": "uuid",
    "started_at": "ISO",
    "task_stack": ["task1", "task2"]
  },
  "state": {
    "current_skill": null,
    "pending_actions": [],
    "context_variables": {}
  },
  "statistics": {
    "total_sessions": 0,
    "total_skills_executed": 0,
    "total_errors_encountered": 0,
    "total_errors_resolved": 0
  }
}
```

### 2.3 Knowledge Base Structures

**patterns.json:**
```json
{
  "patterns": [
    {
      "id": "pat-001",
      "name": "Import Path Error",
      "description": "Rutas relativas incorrectas en models/index.js",
      "occurrences": 5,
      "first_seen": "ISO",
      "last_seen": "ISO",
      "trigger_conditions": ["skill=make-software", "file=models/index.js"],
      "resolution_id": "sol-001"
    }
  ]
}
```

**solutions.json:**
```json
{
  "solutions": [
    {
      "id": "sol-001",
      "pattern_id": "pat-001",
      "description": "Usar rutas relativas correctas desde dentro de models/",
      "success_rate": 0.95,
      "applied_count": 12,
      "code_template": "const Model = require('./ModelName'); // No './models/ModelName'",
      "guardrail_added": "5.1 in make-software"
    }
  ]
}
```

**anti-patterns.json:**
```json
{
  "anti_patterns": [
    {
      "id": "anti-001",
      "name": "Nested Model Path",
      "bad_example": "require('./models/Entity')",
      "good_example": "require('./Entity')",
      "context": "Dentro de la carpeta models/",
      "severity": "critical",
      "blocked_by_guardrail": true
    }
  ]
}
```

## 3. OPERATIONS

### 3.1 INITIALIZE_SESSION
Iniciar nueva sesión y cargar memoria.

**Proceso:**
```
1. Generar session_id
2. Cargar memory.json
3. Cargar knowledge_base/*
4. Establecer session.started_at
5. Incrementar statistics.total_sessions
```

### 3.2 STORE_CONTEXT
Guardar variable de contexto.

```javascript
memory.storeContext('current_blueprint_version', '1.0.0');
memory.storeContext('last_generated_entity', 'User');
```

### 3.3 RETRIEVE_CONTEXT
Recuperar variable de contexto.

```javascript
const version = memory.getContext('current_blueprint_version');
```

### 3.4 LEARN_PATTERN
Registrar nuevo patrón detectado.

**Trigger:** Llamado por pattern-recognizer cuando identifica patrón.

**Proceso:**
```
1. Verificar si patrón ya existe
2. Si existe: incrementar occurrences, actualizar last_seen
3. Si no existe: crear nuevo patrón
4. Persistir en patterns.json
```

### 3.5 RECORD_SOLUTION
Registrar solución exitosa.

**Trigger:** Cuando un error se resuelve exitosamente.

**Proceso:**
```
1. Vincular con pattern_id
2. Actualizar success_rate
3. Incrementar applied_count
4. Persistir en solutions.json
```

### 3.6 ADD_ANTI_PATTERN
Registrar patrón a evitar.

**Proceso:**
```
1. Crear entrada con bad/good example
2. Marcar severity
3. Vincular con guardrail si existe
```

### 3.7 QUERY_KNOWLEDGE
Consultar conocimiento relevante.

**Queries:**
- `getPatternsBySkill(skill_id)` → Patrones asociados
- `getSolutionForPattern(pattern_id)` → Solución recomendada
- `getAntiPatterns(context)` → Anti-patrones a evitar
- `getRelevantKnowledge(query)` → Búsqueda semántica

### 3.8 SNAPSHOT
Crear snapshot del estado actual.

**Trigger:** Antes de cambios mayores, diario, o manual.

## 4. INTEGRATION HOOKS

### 4.1 Pre-Skill Execution
```javascript
// Antes de ejecutar cualquier skill:
const antiPatterns = memory.getAntiPatterns(skill_id);
const knownIssues = memory.getPatternsBySkill(skill_id);
// Inyectar en contexto del skill
```

### 4.2 Post-Error
```javascript
// Cuando ocurre un error:
const existingPattern = memory.findPattern(error);
if (existingPattern) {
  const solution = memory.getSolution(existingPattern.id);
  // Sugerir solución conocida
} else {
  // Registrar nuevo patrón potencial
  memory.flagForAnalysis(error);
}
```

### 4.3 Post-Success
```javascript
// Cuando una ejecución es exitosa:
if (previouslyFailed) {
  memory.recordSolution({
    pattern_id: previousPattern.id,
    resolution: currentApproach
  });
}
```

## 5. KNOWLEDGE ENRICHMENT

### 5.1 Fuentes de Conocimiento
- POST_MORTEM.md de skills
- Logs de ejecución (via execution-logger)
- Feedback explícito del usuario
- Auto-análisis de pattern-recognizer

### 5.2 Decaimiento de Conocimiento
- Patrones no vistos en 30 días → marcar como `stale`
- Soluciones con success_rate < 0.5 → revisar manualmente
- Anti-patterns confirmados → nunca expiran

## 6. GUARDRAILS

1. **BACKUP ANTES DE ESCRITURA:** Crear snapshot antes de modificar memory.json.
2. **VALIDACIÓN DE SCHEMA:** Toda entrada debe cumplir estructura definida.
3. **LÍMITE DE TAMAÑO:** Máximo 1000 patrones activos (archivar antiguos).
4. **CONFLICTO RESOLUTION:** Si dos soluciones contradictorias, mantener la de mayor success_rate.

## 7. CLI COMMANDS (Conceptuales)

```bash
# Ver memoria actual
/memory status

# Buscar conocimiento
/memory search "import error"

# Ver patrones de un skill
/memory patterns make-software

# Ver anti-patrones activos
/memory anti-patterns

# Crear snapshot manual
/memory snapshot
```

## 8. SAMPLE KNOWLEDGE QUERY

```
Query: "¿Cómo evitar errores de import en models/index.js?"

Response:
- Anti-pattern anti-001: No usar require('./models/Entity')
- Solution sol-001: Usar require('./Entity') directamente
- Guardrail: Sección 5.1 de make-software SKILL.md
- Occurrences: 5 veces en últimos 30 días
- Last resolution: 2026-02-03
```
