---
name: Metrics Collector
description: Aggregates and exposes performance metrics from skill executions for analysis
triggers: ["execution complete", "metrics query", "health check", "aggregation cycle"]
---

# ROLE: METRICS COLLECTOR
# AUTHORITY: Meta-Level Observability
# OBJECTIVE: Aggregate, calculate, and expose performance metrics for all skills

## 1. MISSION
Recopilar métricas de rendimiento de todas las ejecuciones de skills, calcular agregaciones útiles, y exponer datos para toma de decisiones. Este collector alimenta al health-monitor y strategy-optimizer.

## 2. DATA STRUCTURES

### 2.1 Collector Location
```
.agent/meta/metrics-collector/
├── SKILL.md                  # Este archivo
├── metrics/
│   ├── current.json          # Métricas actuales (últimas 24h)
│   ├── daily/
│   │   └── YYYY-MM-DD.json   # Agregaciones diarias
│   └── summary.json          # Resumen ejecutivo
└── dashboards/
    └── skill_health.json     # Dashboard de salud
```

### 2.2 Metrics Structure
```json
{
  "timestamp": "ISO-8601",
  "period": "24h",
  "global": {
    "total_executions": 0,
    "success_rate": 0.0,
    "avg_duration_ms": 0,
    "total_errors": 0,
    "active_skills": 0
  },
  "by_skill": {
    "skill-id": {
      "executions": 0,
      "success_rate": 0.0,
      "avg_duration_ms": 0,
      "p50_duration_ms": 0,
      "p95_duration_ms": 0,
      "error_count": 0,
      "error_types": {},
      "last_execution": "ISO",
      "trend": "improving|stable|degrading"
    }
  },
  "by_error_type": {
    "IMPORT_ERROR": { "count": 0, "skills": [] },
    "SYNTAX_ERROR": { "count": 0, "skills": [] }
  }
}
```

## 3. METRICS CATALOG

### 3.1 Execution Metrics
| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `execution_count` | Counter | Total de ejecuciones |
| `success_count` | Counter | Ejecuciones exitosas |
| `failure_count` | Counter | Ejecuciones fallidas |
| `success_rate` | Gauge | % de éxito (success/total) |
| `duration_ms` | Histogram | Distribución de tiempos |

### 3.2 Quality Metrics
| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `error_rate` | Gauge | Errores por ejecución |
| `retry_rate` | Gauge | Reintentos necesarios |
| `coverage_score` | Gauge | % de outputs generados vs esperados |
| `drift_score` | Gauge | Desviación del comportamiento esperado |

### 3.3 Efficiency Metrics
| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `tool_calls_per_exec` | Gauge | Llamadas a herramientas promedio |
| `files_per_exec` | Gauge | Archivos generados promedio |
| `loc_per_exec` | Gauge | Líneas de código promedio |

## 4. OPERATIONS

### 4.1 INGEST
Recibir métricas de una ejecución.

**Trigger:** Llamado por execution-logger al finalizar.

**Input:**
```json
{
  "skill_id": "make-software",
  "execution_id": "uuid",
  "status": "success",
  "duration_ms": 45000,
  "metrics": {
    "tool_calls": 127,
    "files_created": 42
  }
}
```

**Proceso:**
```
1. Validar input
2. Actualizar contadores globales
3. Actualizar métricas del skill
4. Recalcular agregaciones
5. Detectar anomalías
6. Persistir en current.json
```

### 4.2 AGGREGATE
Calcular agregaciones periódicas.

**Trigger:** Cada hora o al cerrar sesión.

**Cálculos:**
- Percentiles (p50, p95, p99)
- Moving averages (7 días)
- Trend detection (improving/stable/degrading)

### 4.3 QUERY
Consultar métricas.

**Endpoints conceptuales:**
- `GET /metrics/global` → Métricas globales
- `GET /metrics/skill/{id}` → Métricas de un skill
- `GET /metrics/errors` → Resumen de errores
- `GET /metrics/trends` → Tendencias

### 4.4 ALERT
Generar alertas cuando métricas cruzan umbrales.

**Umbrales default:**
| Métrica | Warning | Critical |
|---------|---------|----------|
| `success_rate` | < 0.8 | < 0.5 |
| `avg_duration_ms` | > 60000 | > 120000 |
| `error_rate` | > 0.2 | > 0.5 |

## 5. INTEGRATIONS

### 5.1 From Execution Logger
```javascript
// Después de cada ejecución:
metricsCollector.ingest({
  skill_id,
  execution_id,
  status,
  duration_ms,
  metrics: executionLog.metrics
});
```

### 5.2 To Health Monitor
```javascript
// Proveer estado de salud:
const healthData = metricsCollector.getHealthSummary();
healthMonitor.update(healthData);
```

### 5.3 To Skill Registry
```javascript
// Actualizar métricas en registry:
const skillMetrics = metricsCollector.getSkillMetrics(skill_id);
registry.updateMetrics(skill_id, skillMetrics);
```

## 6. ANOMALY DETECTION

### 6.1 Detección Automática
- **Spike Detection:** Incremento > 2σ en error rate
- **Degradation:** Tendencia negativa por > 3 ejecuciones
- **Outliers:** Duración > 3σ del promedio

### 6.2 Acciones
```
IF anomaly detected:
  1. Registrar en alerts[]
  2. Notificar a health-monitor
  3. Marcar skill para revisión
```

## 7. DASHBOARD DATA

### 7.1 Skill Health Dashboard
```json
{
  "generated_at": "ISO",
  "skills": [
    {
      "id": "make-software",
      "health": "healthy|warning|critical",
      "success_rate": 0.85,
      "trend": "stable",
      "last_error": null,
      "recommendation": null
    }
  ],
  "alerts": [],
  "summary": {
    "healthy": 3,
    "warning": 0,
    "critical": 0
  }
}
```

## 8. CLI COMMANDS (Conceptuales)

```bash
# Ver métricas globales
/metrics global

# Ver métricas de un skill
/metrics skill make-software

# Ver errores recientes
/metrics errors

# Ver tendencias
/metrics trends

# Generar reporte
/metrics report
```

## 9. GUARDRAILS

1. **NO BLOQUEAR:** La recolección de métricas nunca debe bloquear la ejecución de skills.
2. **SAMPLING:** Si hay demasiadas ejecuciones, aplicar sampling para agregaciones.
3. **RETENCIÓN:** Mantener current.json con últimas 24h, archivar en daily/.
4. **PRIVACIDAD:** No incluir contenido de errores, solo tipos y conteos.
