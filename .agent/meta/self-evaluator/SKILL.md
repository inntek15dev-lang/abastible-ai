---
name: Self Evaluator
description: Evaluates the quality of skill outputs against expected standards and acceptance criteria
triggers: ["post-execution", "quality audit request", "validation check"]
---

# ROLE: SELF EVALUATOR
# AUTHORITY: Meta-Level Meta-Cognition
# OBJECTIVE: Measure and report quality of skill outputs

## 1. MISSION
Evaluar la calidad de los outputs generados por skills contra estándares definidos, criterios de aceptación del blueprint, y best practices. Proporcionar feedback estructurado para guiar mejoras.

## 2. DATA STRUCTURES

### 2.1 Evaluator Location
```
.agent/meta/self-evaluator/
├── SKILL.md                    # Este archivo
├── evaluations/
│   └── YYYY-MM-DD/
│       └── eval_{id}.json      # Evaluaciones por fecha
├── criteria/
│   ├── code_quality.json       # Criterios de calidad de código
│   ├── completeness.json       # Criterios de completitud
│   └── adherence.json          # Criterios de adherencia
└── scores/
    └── skill_scores.json       # Scores acumulados por skill
```

### 2.2 Evaluation Structure
```json
{
  "id": "eval-001",
  "execution_id": "uuid",
  "skill_id": "make-software",
  "timestamp": "ISO",
  "overall_score": 0.85,
  "status": "pass|warning|fail",
  "dimensions": {
    "completeness": {
      "score": 0.9,
      "status": "pass",
      "details": {
        "expected_outputs": 10,
        "actual_outputs": 9,
        "missing": ["UserDetail.jsx"]
      }
    },
    "correctness": {
      "score": 0.8,
      "status": "pass",
      "details": {
        "syntax_valid": true,
        "runtime_valid": true,
        "tests_pass": null
      }
    },
    "adherence": {
      "score": 0.85,
      "status": "pass",
      "details": {
        "follows_blueprint": true,
        "follows_standards": true,
        "traceability_tags": 0.8
      }
    },
    "efficiency": {
      "score": 0.9,
      "status": "pass",
      "details": {
        "duration_vs_expected": 0.85,
        "tool_calls_vs_expected": 0.9
      }
    }
  },
  "findings": [
    {
      "type": "missing_output",
      "severity": "warning",
      "message": "UserDetail.jsx not generated",
      "recommendation": "Generate page for US-005"
    }
  ],
  "recommendations": []
}
```

## 3. EVALUATION DIMENSIONS

### 3.1 Completeness
¿Se generó todo lo esperado?

| Check | Descripción | Peso |
|-------|-------------|------|
| `outputs_generated` | Archivos generados vs esperados | 0.4 |
| `us_coverage` | User Stories con páginas | 0.3 |
| `entity_coverage` | Entidades con CRUD completo | 0.3 |

### 3.2 Correctness
¿El código funciona?

| Check | Descripción | Peso |
|-------|-------------|------|
| `syntax_valid` | node --check pasa | 0.3 |
| `server_starts` | Backend inicia | 0.3 |
| `frontend_builds` | npm run build pasa | 0.3 |
| `tests_pass` | Tests unitarios pasan | 0.1 |

### 3.3 Adherence
¿Sigue el blueprint y estándares?

| Check | Descripción | Peso |
|-------|-------------|------|
| `blueprint_match` | Estructura coincide | 0.4 |
| `ieee_trace` | Tags IEEE presentes | 0.3 |
| `security_policy` | Auth implementado | 0.3 |

### 3.4 Efficiency
¿Se ejecutó optimamente?

| Check | Descripción | Peso |
|-------|-------------|------|
| `duration_ratio` | Tiempo vs baseline | 0.5 |
| `tool_ratio` | Tool calls vs baseline | 0.3 |
| `no_retries` | Sin reintentos | 0.2 |

## 4. OPERATIONS

### 4.1 EVALUATE
Evaluar output de una ejecución.

**Proceso:**
```
1. Obtener execution log
2. Para cada dimensión:
   a. Aplicar checks relevantes
   b. Calcular score ponderado
   c. Determinar status (pass/warning/fail)
3. Calcular overall_score
4. Generar findings y recommendations
5. Persistir evaluación
```

### 4.2 COMPARE
Comparar evaluación actual con baseline.

```javascript
const comparison = evaluator.compare(currentEval, baselineEval);
// { improved: ['completeness'], degraded: [], unchanged: ['correctness', ...] }
```

### 4.3 AGGREGATE
Calcular scores acumulados por skill.

**Output:** skill_scores.json con tendencias.

### 4.4 REPORT
Generar reporte de calidad.

## 5. SCORING LOGIC

### 5.1 Dimension Score
```javascript
function calculateDimensionScore(checks) {
  return checks.reduce((sum, check) => 
    sum + (check.passed ? check.weight : 0), 0
  );
}
```

### 5.2 Overall Score
```javascript
const weights = {
  completeness: 0.3,
  correctness: 0.35,
  adherence: 0.2,
  efficiency: 0.15
};

const overallScore = Object.entries(dimensions)
  .reduce((sum, [dim, data]) => sum + data.score * weights[dim], 0);
```

### 5.3 Status Thresholds
| Score | Status |
|-------|--------|
| >= 0.8 | pass |
| >= 0.6 | warning |
| < 0.6 | fail |

## 6. INTEGRATIONS

### 6.1 From Execution Logger
```javascript
// Después de cada ejecución:
const evaluation = selfEvaluator.evaluate(executionLog);
```

### 6.2 To Metrics Collector
```javascript
metricsCollector.recordQuality(skill_id, evaluation.overall_score);
```

### 6.3 To Strategy Optimizer
```javascript
// Si score bajo:
strategyOptimizer.flagForOptimization(skill_id, evaluation.findings);
```

### 6.4 To Health Monitor
```javascript
// Reportar estado de calidad:
healthMonitor.updateQualityScore(skill_id, evaluation);
```

## 7. AUTOMATED CHECKS

### 7.1 Code Quality Checks
```bash
# Syntax validation
node --check back/src/server.js

# Build check
cd front && npm run build

# Placeholder audit
grep -r "PlaceholderPage" front/src/
```

### 7.2 Blueprint Compliance
```javascript
// Verificar que entidades del blueprint tienen modelos
const blueprintEntities = blueprint.entities.map(e => e.table_name);
const generatedModels = fs.readdirSync('back/src/database/models/');
const coverage = intersection(blueprintEntities, generatedModels) / blueprintEntities.length;
```

## 8. CLI COMMANDS (Conceptuales)

```bash
# Evaluar última ejecución
/evaluate last

# Evaluar ejecución específica
/evaluate exec-001

# Ver score de skill
/evaluate skill make-software

# Ver tendencias
/evaluate trends

# Generar reporte
/evaluate report
```

## 9. SAMPLE OUTPUT

```
╔══════════════════════════════════════════════╗
║   📊 EVALUATION REPORT: make-software        ║
╠══════════════════════════════════════════════╣
║ Execution: exec-001                          ║
║ Overall Score: 85% (PASS)                    ║
╚══════════════════════════════════════════════╝

Dimensions:
  ✅ Completeness:  90% - 9/10 outputs generated
  ✅ Correctness:   80% - Syntax OK, Build OK
  ✅ Adherence:     85% - Blueprint match, IEEE tags
  ✅ Efficiency:    90% - Under time budget

Findings:
  ⚠️ UserDetail.jsx not generated (US-005)
  ℹ️ 2 components using PlaceholderPage

Recommendations:
  1. Generate missing page for US-005
  2. Replace PlaceholderPage components
```

## 10. GUARDRAILS

1. **NO BLOQUEAR:** Evaluación no debe impedir finalización de skill.
2. **OBJETIVIDAD:** Usar métricas cuantificables, no juicios subjetivos.
3. **TRAZABILIDAD:** Vincular findings con fuente verificable.
4. **ACTIONABLE:** Cada finding debe tener recommendation.
