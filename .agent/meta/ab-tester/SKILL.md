---
name: A/B Tester
description: Compares skill versions in controlled conditions to validate improvements
triggers: ["post-mutation evaluation", "version comparison request", "optimization experiment"]
---

# ROLE: A/B TESTER
# AUTHORITY: Meta-Level Auto-Improvement
# OBJECTIVE: Validate skill improvements through controlled experimentation

## 1. MISSION
Comparar diferentes versiones de skills en condiciones controladas para validar que las mutaciones realmente mejoran el rendimiento antes de adopción permanente.

## 2. DATA STRUCTURES

### 2.1 Tester Location
```
.agent/meta/ab-tester/
├── SKILL.md                  # Este archivo
├── experiments/
│   ├── active.json           # Experimentos en curso
│   ├── completed.json        # Experimentos finalizados
│   └── YYYY-MM-DD/
│       └── exp_{id}.json     # Detalle de experimento
├── versions/
│   └── {skill_id}/
│       └── v{version}.md     # Versiones para testing
└── config.json               # Configuración global
```

### 2.2 Experiment Structure
```json
{
  "id": "exp-001",
  "status": "pending|running|completed|aborted",
  "skill_id": "make-software",
  "created_at": "ISO",
  "started_at": "ISO",
  "completed_at": "ISO",
  "variants": {
    "control": {
      "version": "1.0.0",
      "path": ".agent/skills/make-software/SKILL.md",
      "description": "Versión actual sin cambios"
    },
    "treatment": {
      "version": "1.1.0-beta",
      "path": ".agent/meta/ab-tester/versions/make-software/v1.1.0-beta.md",
      "mutation_id": "mut-001",
      "description": "Con nuevo guardrail de imports"
    }
  },
  "hypothesis": {
    "statement": "El nuevo guardrail reducirá errores MODULE_NOT_FOUND",
    "primary_metric": "success_rate",
    "expected_improvement": 0.1,
    "confidence_level": 0.95
  },
  "allocation": {
    "strategy": "round_robin|random|weighted",
    "control_weight": 0.5,
    "treatment_weight": 0.5
  },
  "results": {
    "control": {
      "executions": 0,
      "successes": 0,
      "failures": 0,
      "avg_duration_ms": 0,
      "error_types": {}
    },
    "treatment": {
      "executions": 0,
      "successes": 0,
      "failures": 0,
      "avg_duration_ms": 0,
      "error_types": {}
    }
  },
  "analysis": {
    "winner": null,
    "p_value": null,
    "improvement": null,
    "recommendation": null
  },
  "config": {
    "min_executions_per_variant": 5,
    "max_duration_days": 7,
    "auto_stop_on_significance": true,
    "rollback_on_degradation": true
  }
}
```

## 3. EXPERIMENT LIFECYCLE

### 3.1 States
```
pending → running → completed
              ↓
           aborted
```

### 3.2 Transitions
| From | To | Trigger |
|------|----|---------|
| pending | running | Manual start o auto-start |
| running | completed | Min executions reached + significance |
| running | aborted | Degradation detected o manual |

## 4. OPERATIONS

### 4.1 CREATE_EXPERIMENT
Crear nuevo experimento A/B.

**Input:**
```javascript
abTester.createExperiment({
  skill_id: 'make-software',
  mutation_id: 'mut-001',
  hypothesis: 'Nuevo guardrail mejora success rate',
  min_executions: 5
});
```

**Proceso:**
```
1. Crear copia de skill actual como control
2. Crear versión modificada como treatment
3. Configurar experimento
4. Guardar en experiments/active.json
```

### 4.2 START_EXPERIMENT
Iniciar experimento.

**Proceso:**
```
1. Marcar como running
2. Activar allocation strategy
3. Notificar a orchestrator
```

### 4.3 RECORD_EXECUTION
Registrar resultado de ejecución bajo experimento.

**Proceso:**
```
1. Determinar variant asignado
2. Ejecutar skill con variant correcto
3. Registrar resultado en results
4. Verificar stopping conditions
```

### 4.4 ANALYZE
Calcular resultados estadísticos.

**Cálculos:**
- Success rate por variant
- Chi-squared test para significancia
- Confidence intervals

### 4.5 CONCLUDE
Finalizar experimento con recomendación.

**Proceso:**
```
1. Calcular análisis final
2. Determinar winner
3. Generar recomendación:
   - ADOPT: Treatment es significativamente mejor
   - REJECT: Control es igual o mejor
   - EXTEND: No hay significancia, necesita más datos
```

## 5. STATISTICAL METHODS

### 5.1 Primary Analysis
```javascript
// Chi-squared test para success rate
const chiSquared = calculateChiSquared(
  control.successes, control.failures,
  treatment.successes, treatment.failures
);
const pValue = getPValue(chiSquared, df=1);
const significant = pValue < 0.05;
```

### 5.2 Effect Size
```javascript
// Relative improvement
const improvement = (treatment.success_rate - control.success_rate) / control.success_rate;
```

### 5.3 Confidence Interval
```javascript
// 95% CI for difference
const ci = calculateConfidenceInterval(control, treatment, 0.95);
```

## 6. SAFETY MECHANISMS

### 6.1 Early Stopping
```
SI treatment.failure_rate > control.failure_rate * 1.5:
  Abortar experimento
  Rollback mutation
  Notificar
```

### 6.2 Guardrails
- Máximo 1 experimento activo por skill
- Mínimo 5 ejecuciones por variante
- Máximo 7 días de duración
- No experimentar con skills críticos sin backup

## 7. INTEGRATIONS

### 7.1 From Skill Mutator
```javascript
// Después de aprobar mutación:
const experiment = abTester.createExperiment({
  skill_id: mutation.skill_id,
  mutation_id: mutation.id
});
experiment.start();
```

### 7.2 To Skill Registry
```javascript
// Si treatment gana:
registry.promoteVersion(skill_id, treatmentVersion);
```

### 7.3 To Metrics Collector
```javascript
// Durante experimento:
metricsCollector.tagExecution(execution_id, {
  experiment_id: exp.id,
  variant: 'treatment'
});
```

## 8. CLI COMMANDS (Conceptuales)

```bash
# Crear experimento
/experiment create make-software --mutation mut-001

# Ver experimentos activos
/experiment list active

# Ver detalle
/experiment show exp-001

# Iniciar experimento
/experiment start exp-001

# Ver resultados parciales
/experiment results exp-001

# Abortar
/experiment abort exp-001

# Concluir y adoptar
/experiment adopt exp-001
```

## 9. SAMPLE RESULTS

```
═══════════════════════════════════════════════
  A/B TEST RESULTS: exp-001
═══════════════════════════════════════════════

Skill: make-software
Duration: 5 days
Status: COMPLETED

                Control     Treatment
─────────────────────────────────────────
Executions      10          10
Successes       7           9
Failures        3           1
Success Rate    70%         90%
Avg Duration    45s         42s

━━━ STATISTICAL ANALYSIS ━━━
Improvement: +28.6% (relative)
P-Value: 0.032 (significant at α=0.05)
95% CI: [+5%, +52%]

━━━ RECOMMENDATION ━━━
✅ ADOPT TREATMENT

The new guardrail significantly improved success rate.
Recommend promoting v1.1.0 to production.
```

## 10. GUARDRAILS

1. **NO PRODUCCIÓN SIN VALIDACIÓN:** Mutaciones importantes deben pasar A/B test.
2. **EARLY STOPPING:** Abortar si treatment degrada significativamente.
3. **MÍNIMO SAMPLE SIZE:** No concluir sin mínimo de ejecuciones.
4. **DOCUMENTAR CONCLUSIONES:** Registrar learnings para futuro.
