---
name: Strategy Optimizer
description: Dynamically adjusts skill execution flow based on context, history, and performance data
triggers: ["pre-orchestration", "performance degradation", "context change", "manual optimization"]
---

# ROLE: STRATEGY OPTIMIZER
# AUTHORITY: Meta-Level Meta-Cognition
# OBJECTIVE: Optimize skill execution strategies based on empirical data

## 1. MISSION
Ajustar dinámicamente las estrategias de ejecución de skills basándose en contexto, historial, métricas de rendimiento, y patrones detectados. Este optimizer permite al sistema **adaptarse a diferentes situaciones**.

## 2. DATA STRUCTURES

### 2.1 Optimizer Location
```
.agent/meta/strategy-optimizer/
├── SKILL.md                   # Este archivo
├── strategies/
│   ├── active.json            # Estrategias activas
│   ├── available.json         # Estrategias disponibles
│   └── custom/
│       └── {strategy}.json    # Estrategias personalizadas
├── rules/
│   └── optimization_rules.json
└── history/
    └── decisions.json         # Historial de decisiones
```

### 2.2 Strategy Structure
```json
{
  "id": "strat-001",
  "name": "High-Reliability Mode",
  "description": "Prioriza validación sobre velocidad",
  "applicable_when": {
    "skill_success_rate": "< 0.8",
    "error_pattern_active": true
  },
  "modifications": {
    "add_steps": [
      {
        "after": "code_generation",
        "step": "syntax_validation",
        "command": "node --check"
      }
    ],
    "skip_steps": [],
    "increase_timeout": 1.5,
    "enable_verbose_logging": true
  },
  "expected_impact": {
    "success_rate": "+15%",
    "execution_time": "+20%"
  }
}
```

### 2.3 Optimization Rule Structure
```json
{
  "id": "rule-001",
  "name": "Low Success Rate Trigger",
  "condition": {
    "type": "metric_threshold",
    "metric": "success_rate",
    "operator": "<",
    "value": 0.8,
    "lookback_days": 7
  },
  "action": {
    "type": "apply_strategy",
    "strategy_id": "strat-001"
  },
  "priority": 1
}
```

## 3. OPTIMIZATION STRATEGIES

### 3.1 Pre-built Strategies
| ID | Nombre | Trigger | Efecto |
|----|--------|---------|--------|
| `default` | Balanced | Base | Ejecución estándar |
| `strat-001` | High-Reliability | success_rate < 0.8 | +validación |
| `strat-002` | Fast-Track | success_rate > 0.95 | -validación |
| `strat-003` | Debug-Mode | consecutive_failures > 2 | +logging +breakpoints |
| `strat-004` | Recovery | after_rollback | +caution +verification |

### 3.2 Strategy Modifications
| Tipo | Descripción |
|------|-------------|
| `add_steps` | Inyectar pasos adicionales |
| `skip_steps` | Omitir pasos opcionales |
| `reorder_steps` | Cambiar orden de ejecución |
| `modify_timeout` | Ajustar timeouts |
| `enable_flags` | Activar flags especiales |

## 4. OPERATIONS

### 4.1 EVALUATE_CONTEXT
Evaluar contexto actual para determinar estrategia.

**Input:** skill_id, current_metrics, patterns
**Output:** recommended_strategy

**Proceso:**
```
1. Cargar reglas de optimization_rules.json
2. Para cada regla (ordenadas por prioridad):
   a. Evaluar condición contra contexto
   b. SI condición se cumple → aplicar acción
3. SI ninguna regla aplica → usar default
4. Registrar decisión en history
```

### 4.2 APPLY_STRATEGY
Aplicar estrategia seleccionada.

**Proceso:**
```
1. Cargar definición de estrategia
2. Modificar plan de ejecución:
   - Insertar pasos adicionales
   - Ajustar timeouts
   - Configurar logging
3. Notificar a orchestrator
```

### 4.3 MONITOR_EFFECTIVENESS
Monitorear efectividad de estrategia aplicada.

**Proceso:**
```
1. Comparar métricas antes/después
2. SI mejora → incrementar confidence
3. SI empeora → considerar cambiar estrategia
4. Actualizar regla con nuevos datos
```

### 4.4 ADD_RULE
Agregar nueva regla de optimización.

### 4.5 REVERT_STRATEGY
Revertir a estrategia anterior.

## 5. ADAPTIVE LOGIC

### 5.1 Context Signals
| Signal | Fuente | Impacto |
|--------|--------|---------|
| `success_rate_7d` | Metrics Collector | Selección de estrategia |
| `active_patterns` | Pattern Recognizer | Activar precauciones |
| `drift_detected` | Drift Detector | Activar validaciones |
| `quality_score` | Self Evaluator | Ajustar rigor |

### 5.2 Decision Matrix
```
IF success_rate < 0.7 AND active_errors > 0:
  → strat-003 (Debug Mode)
ELSE IF success_rate < 0.8:
  → strat-001 (High-Reliability)
ELSE IF success_rate > 0.95 AND no_drift:
  → strat-002 (Fast-Track)
ELSE:
  → default
```

## 6. INTEGRATIONS

### 6.1 From Self Evaluator
```javascript
// Cuando quality score baja:
strategyOptimizer.flagForOptimization(skill_id, findings);
```

### 6.2 From Health Monitor
```javascript
// Cuando skill degrada:
const strategy = strategyOptimizer.evaluateContext({
  skill_id,
  metrics: healthMonitor.getSkillMetrics(skill_id),
  patterns: patternRecognizer.getActivePatterns(skill_id)
});
```

### 6.3 To Orchestrator
```javascript
// Antes de ejecutar skill:
const plan = orchestrator.getExecutionPlan(skill_id);
const optimizedPlan = strategyOptimizer.apply(plan, strategy);
```

## 7. CLI COMMANDS (Conceptuales)

```bash
# Ver estrategia actual
/strategy current make-software

# Listar estrategias disponibles
/strategy list

# Aplicar estrategia manual
/strategy apply strat-001 make-software

# Ver historial de decisiones
/strategy history

# Agregar regla
/strategy rule add --condition "success_rate < 0.7" --action "strat-003"
```

## 8. SAMPLE DECISION LOG

```json
{
  "timestamp": "2026-02-05T22:50:00-03:00",
  "skill_id": "make-software",
  "context": {
    "success_rate_7d": 0.75,
    "active_patterns": ["pat-001"],
    "drift_status": "clean",
    "quality_score": 0.8
  },
  "evaluated_rules": [
    { "rule": "rule-001", "matched": true },
    { "rule": "rule-002", "matched": false }
  ],
  "selected_strategy": "strat-001",
  "modifications_applied": [
    "Added syntax validation step",
    "Enabled verbose logging"
  ]
}
```

## 9. GUARDRAILS

1. **NO DEGRADAR INTENCIONALMENTE:** Nunca aplicar estrategia que reduzca calidad esperada.
2. **REVERSIBILIDAD:** Toda optimización debe ser revertible.
3. **MONITOREO:** Siempre monitorear efectividad post-aplicación.
4. **RATE LIMIT:** Máximo 1 cambio de estrategia por ejecución.
