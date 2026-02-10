---
name: Execution Logger
description: Records every skill execution with full context, metrics, and outcomes for analysis
triggers: ["skill start", "skill end", "error capture", "metrics query"]
---

# ROLE: EXECUTION LOGGER
# AUTHORITY: Meta-Level Infrastructure
# OBJECTIVE: Create immutable audit trail of all skill executions

## 1. MISSION
Registrar cada ejecución de skills con contexto completo, métricas de rendimiento, errores encontrados, y resultados. Este log es la **fuente primaria de datos** para el pattern-recognizer y metrics-collector.

## 2. DATA STRUCTURES

### 2.1 Logger Location
```
.agent/meta/execution-logger/
├── SKILL.md                           # Este archivo
├── schemas/
│   └── execution_log.schema.json      # Validación
└── logs/
    └── YYYY-MM-DD/                    # Logs por fecha
        └── exec_{uuid}.json           # Un archivo por ejecución
```

### 2.2 Log Entry Structure
```json
{
  "execution_id": "uuid-v4",
  "skill_id": "make-software",
  "timestamp_start": "ISO-8601",
  "timestamp_end": "ISO-8601",
  "status": "success|failure|partial|aborted",
  "inputs": {
    "blueprint_version": "1.0.0",
    "parameters": {}
  },
  "outputs": {
    "files_created": ["./back/src/server.js", "..."],
    "files_modified": [],
    "artifacts": []
  },
  "errors": [
    {
      "type": "MODULE_NOT_FOUND",
      "message": "Cannot find module './models/Role'",
      "stack": "...",
      "timestamp": "ISO"
    }
  ],
  "metrics": {
    "duration_ms": 45000,
    "tool_calls": 127,
    "files_created": 42,
    "files_modified": 3,
    "lines_of_code": 2847
  },
  "context": {
    "conversation_id": "...",
    "user_request": "...",
    "environment": "windows"
  }
}
```

## 3. OPERATIONS

### 3.1 LOG_START
Registrar inicio de ejecución de skill.

**Trigger:** Al detectar inicio de skill (task_boundary con skill conocido).

**Proceso:**
```
1. Generar execution_id (UUID v4)
2. Crear archivo logs/YYYY-MM-DD/exec_{id}.json
3. Registrar timestamp_start
4. Capturar contexto inicial
5. Establecer status = "running"
6. Retornar execution_id para tracking
```

### 3.2 LOG_UPDATE
Actualizar log durante ejecución.

**Proceso:**
```
1. Agregar outputs incrementalmente
2. Registrar errores inmediatamente
3. Actualizar métricas parciales
```

### 3.3 LOG_END
Finalizar registro de ejecución.

**Proceso:**
```
1. Registrar timestamp_end
2. Calcular duration_ms
3. Determinar status final
4. Cerrar archivo de log
5. Notificar a skill-registry para actualizar métricas
6. Notificar a metrics-collector
```

### 3.4 QUERY_LOGS
Consultar logs históricos.

**Queries soportadas:**
- Por skill: `logs?skill_id=make-software`
- Por estado: `logs?status=failure`
- Por fecha: `logs?date=2026-02-05`
- Por rango: `logs?from=2026-02-01&to=2026-02-05`
- Últimas N: `logs?last=10`

### 3.5 EXTRACT_PATTERNS
Extraer patrones de logs para analysis.

**Output:** Agregaciones útiles para pattern-recognizer:
- Errores más frecuentes por skill
- Tiempos promedio por skill
- Secuencias de éxito/fallo

## 4. INTEGRATION HOOKS

### 4.1 Auto-Detection
El logger DEBE detectar automáticamente:
- Llamadas a `task_boundary` con TaskName que coincida con skill registrado
- Invocaciones explícitas de skills vía `/skill-name`
- Ejecuciones encadenadas (skill que invoca otro skill)

### 4.2 Registry Integration
```javascript
// Al finalizar cada ejecución:
const result = await logger.logEnd(execution_id, finalStatus);
await registry.recordExecution(skill_id, {
  status: result.status,
  duration_ms: result.metrics.duration_ms,
  timestamp: result.timestamp_end
});
```

### 4.3 Metrics Collector Integration
```javascript
// Notificar métricas:
metricsCollector.ingest({
  skill_id,
  execution_id,
  metrics: result.metrics,
  status: result.status
});
```

## 5. ERROR CLASSIFICATION

El logger categoriza errores automáticamente:

| Categoría | Patrón | Acción Sugerida |
|-----------|--------|-----------------|
| `IMPORT_ERROR` | MODULE_NOT_FOUND, require() | Verificar rutas |
| `SYNTAX_ERROR` | SyntaxError, Unexpected token | Validar código |
| `DB_ERROR` | ER_NO_SUCH_TABLE, connection refused | Verificar BD |
| `AUTH_ERROR` | 401, 403, JWT | Verificar credenciales |
| `TIMEOUT` | ETIMEDOUT, context deadline | Aumentar timeout |
| `UNKNOWN` | Otros | Investigar manualmente |

## 6. RETENTION POLICY

- **Hot Storage (7 días):** Logs completos en `logs/YYYY-MM-DD/`
- **Warm Storage (30 días):** Logs comprimidos en `archive/YYYY-MM/`
- **Cold Storage (indefinido):** Solo métricas agregadas en `metrics/aggregated.json`

## 7. GUARDRAILS

1. **INMUTABILIDAD:** Los logs no se modifican después de `LOG_END`.
2. **ATOMICIDAD:** Cada log es un archivo separado (no corrupción cruzada).
3. **PRIVACIDAD:** No registrar contenido sensible (passwords, tokens).
4. **TAMAÑO:** Truncar stack traces a 1000 caracteres.

## 8. CLI COMMANDS (Conceptuales)

```bash
# Ver últimas ejecuciones
/logs recent 10

# Ver errores de un skill
/logs errors make-software

# Estadísticas del día
/logs stats today

# Buscar por error
/logs search "MODULE_NOT_FOUND"
```

## 9. SAMPLE LOG OUTPUT

```json
{
  "execution_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "skill_id": "make-software",
  "timestamp_start": "2026-02-05T22:00:00-03:00",
  "timestamp_end": "2026-02-05T22:45:00-03:00",
  "status": "success",
  "inputs": {
    "blueprint_path": ".agent/prompts/master_blueprint.prompt"
  },
  "outputs": {
    "files_created": [
      "./back/package.json",
      "./back/src/server.js",
      "./front/package.json",
      "./front/src/App.jsx"
    ],
    "files_modified": [],
    "artifacts": ["walkthrough.md"]
  },
  "errors": [],
  "metrics": {
    "duration_ms": 2700000,
    "tool_calls": 156,
    "files_created": 47,
    "files_modified": 0,
    "lines_of_code": 3250
  }
}
```
