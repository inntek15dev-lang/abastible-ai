---
name: Pattern Recognizer
description: Analyzes execution logs to identify recurring patterns, errors, and success sequences
triggers: ["batch analysis", "post-execution", "anomaly detected", "manual analysis request"]
---

# ROLE: PATTERN RECOGNIZER
# AUTHORITY: Meta-Level Auto-Improvement
# OBJECTIVE: Identify actionable patterns from execution history

## 1. MISSION
Analizar logs de ejecución para identificar patrones recurrentes de errores, secuencias exitosas, y anomalías. Los patrones identificados alimentan al skill-mutator y knowledge-distiller.

## 2. DATA STRUCTURES

### 2.1 Recognizer Location
```
.agent/meta/pattern-recognizer/
├── SKILL.md                   # Este archivo
├── patterns/
│   ├── detected.json          # Patrones detectados
│   ├── confirmed.json         # Patrones verificados
│   └── archived.json          # Patrones históricos
├── algorithms/
│   └── detection_rules.json   # Reglas de detección
└── analysis/
    └── YYYY-MM-DD.json        # Análisis por fecha
```

### 2.2 Pattern Structure
```json
{
  "id": "pat-001",
  "status": "detected|confirmed|archived|false_positive",
  "type": "error|success|anomaly|performance",
  "category": "import_error|syntax_error|db_error|...",
  "signature": {
    "skill_id": "make-software",
    "error_type": "MODULE_NOT_FOUND",
    "error_pattern": "Cannot find module './models/*'",
    "file_pattern": "models/index.js"
  },
  "occurrences": [
    {
      "execution_id": "uuid",
      "timestamp": "ISO",
      "context": {}
    }
  ],
  "frequency": {
    "total": 5,
    "last_7_days": 3,
    "last_30_days": 5
  },
  "impact": {
    "severity": "critical|warning|info",
    "blocked_executions": 5,
    "time_lost_ms": 225000
  },
  "resolution": {
    "status": "unresolved|has_solution|auto_resolved",
    "solution_id": null,
    "guardrail_ref": null
  },
  "metadata": {
    "first_seen": "ISO",
    "last_seen": "ISO",
    "detected_by": "algorithm|manual",
    "confidence": 0.95
  }
}
```

## 3. PATTERN TYPES

### 3.1 Error Patterns
Secuencias de errores recurrentes.

| Tipo | Firma | Ejemplos |
|------|-------|----------|
| `import_error` | MODULE_NOT_FOUND | Rutas incorrectas |
| `syntax_error` | SyntaxError, Unexpected | Código malformado |
| `db_error` | ER_*, connection | Problemas de BD |
| `auth_error` | 401, 403, JWT | Autenticación fallida |
| `validation_error` | Required field | Datos incompletos |

### 3.2 Success Patterns
Secuencias que consistentemente funcionan.

| Tipo | Descripción |
|------|-------------|
| `golden_path` | Secuencia de skills que siempre funciona |
| `recovery_sequence` | Pasos que resuelven un error |
| `optimal_order` | Orden de ejecución más eficiente |

### 3.3 Anomaly Patterns
Desviaciones del comportamiento esperado.

| Tipo | Detección |
|------|-----------|
| `performance_spike` | Duración > 3σ del promedio |
| `sudden_failure` | Skill que fallaba < 10% ahora falla > 50% |
| `resource_leak` | Incremento constante en uso de recursos |

## 4. DETECTION ALGORITHMS

### 4.1 Frequency Analysis
```
Para cada error en logs:
  1. Normalizar mensaje de error (remove IDs, paths específicos)
  2. Calcular hash de la firma
  3. Incrementar contador para esa firma
  4. SI contador >= threshold → Detectar patrón
```

### 4.2 Sequence Mining
```
Para cada sesión:
  1. Extraer secuencia de (skill, status)
  2. Aplicar algoritmo de prefijos frecuentes
  3. Identificar subsecuencias que aparecen > N veces
  4. Clasificar como success_pattern o error_pattern
```

### 4.3 Anomaly Detection
```
Para cada skill:
  1. Calcular baseline (promedio, σ) de últimos 30 días
  2. Comparar ejecución actual con baseline
  3. SI valor > 3σ → Flag como anomalía
```

## 5. OPERATIONS

### 5.1 ANALYZE
Ejecutar análisis completo de logs.

**Proceso:**
```
1. Cargar logs de execution-logger
2. Aplicar detection algorithms
3. Comparar con patterns/detected.json existentes
4. Agregar nuevos patrones o actualizar existentes
5. Calcular confidence scores
6. Generar reporte en analysis/
```

### 5.2 CONFIRM_PATTERN
Confirmar que un patrón detectado es válido.

**Trigger:** Manual o automático si ocurrences >= 3 con confidence > 0.8

### 5.3 LINK_SOLUTION
Vincular patrón con solución conocida.

```javascript
patternRecognizer.linkSolution('pat-001', 'sol-001');
```

### 5.4 ARCHIVE_PATTERN
Archivar patrón que ya no ocurre.

**Trigger:** Si last_seen > 30 días

### 5.5 QUERY_PATTERNS
Consultar patrones por criterio.

```javascript
// Patrones de un skill
const patterns = recognizer.getPatterns({ skill_id: 'make-software' });

// Patrones sin resolver
const unresolved = recognizer.getPatterns({ resolution: 'unresolved' });

// Patrones recientes
const recent = recognizer.getPatterns({ last_7_days: true });
```

## 6. INTEGRATIONS

### 6.1 From Execution Logger
```javascript
// Después de cada ejecución con error:
if (execution.status === 'failure') {
  patternRecognizer.analyzeExecution(execution);
}
```

### 6.2 To Context Memory
```javascript
// Cuando se confirma un patrón:
contextMemory.learnPattern(confirmedPattern);

// Cuando se resuelve:
contextMemory.recordSolution(pattern, solution);
```

### 6.3 To Skill Mutator
```javascript
// Cuando hay patrón confirmado sin solución:
skillMutator.proposeFix(pattern);
```

### 6.4 To Knowledge Distiller
```javascript
// Proveer patrones para destilación:
const patternsForDistillation = recognizer.getConfirmedPatterns();
```

## 7. DETECTION RULES

### 7.1 Rule Format
```json
{
  "id": "rule-001",
  "name": "Import Path Error Detection",
  "enabled": true,
  "trigger": {
    "error_type": "MODULE_NOT_FOUND",
    "message_pattern": "Cannot find module '(.+)'"
  },
  "extraction": {
    "module_path": "$1"
  },
  "classification": {
    "category": "import_error",
    "severity": "critical"
  },
  "threshold": {
    "min_occurrences": 2,
    "timeframe_hours": 168
  }
}
```

## 8. CLI COMMANDS (Conceptuales)

```bash
# Ejecutar análisis
/patterns analyze

# Ver patrones detectados
/patterns list

# Ver patrones de un skill
/patterns skill make-software

# Confirmar patrón
/patterns confirm pat-001

# Marcar como falso positivo
/patterns dismiss pat-001

# Ver patrones sin resolver
/patterns unresolved
```

## 9. SAMPLE OUTPUT

```
🔍 Pattern Analysis Report

New Patterns Detected: 1
Patterns Updated: 2
Patterns Confirmed: 0

━━━ NEW PATTERN ━━━
ID: pat-003
Type: error (import_error)
Skill: make-software
Signature: "Cannot find module '../config/database'"
Occurrences: 2 (last 7 days)
Confidence: 0.75
Recommendation: Investigate controller imports

━━━ UPDATED PATTERNS ━━━
pat-001: +1 occurrence (total: 6)
pat-002: Last seen updated
```

## 10. GUARDRAILS

1. **CONFIDENCE THRESHOLD:** No proponer soluciones para patrones con confidence < 0.7
2. **BATCH PROCESSING:** Analizar en lotes para no sobrecargar
3. **DEDUPLICATION:** Normalizar mensajes de error antes de comparar
4. **FALSE POSITIVE HANDLING:** Permitir marcar como falso positivo
5. **PRIVACY:** No almacenar datos sensibles en patrones
