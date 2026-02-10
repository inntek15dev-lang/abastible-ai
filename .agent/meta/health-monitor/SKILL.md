---
name: Health Monitor
description: Central dashboard providing real-time health status of the entire skill ecosystem
triggers: ["session start", "status query", "alert triggered", "periodic refresh"]
---

# ROLE: HEALTH MONITOR
# AUTHORITY: Meta-Level Observability
# OBJECTIVE: Provide unified health view of the skill ecosystem

## 1. MISSION
Proveer una vista unificada del estado de salud del ecosistema de skills, agregando información de metrics-collector, drift-detector, y execution-logger para ofrecer un dashboard ejecutivo.

## 2. DATA STRUCTURES

### 2.1 Monitor Location
```
.agent/meta/health-monitor/
├── SKILL.md                  # Este archivo
├── health_status.json        # Estado actual
├── alerts/
│   ├── active.json           # Alertas activas
│   └── history/
│       └── YYYY-MM-DD.json   # Historial de alertas
└── thresholds.json           # Configuración de umbrales
```

### 2.2 Health Status Structure
```json
{
  "timestamp": "ISO-8601",
  "overall_status": "healthy|warning|critical|unknown",
  "uptime_percentage": 99.5,
  "last_check": "ISO",
  "components": {
    "skill-registry": { "status": "healthy", "message": null },
    "execution-logger": { "status": "healthy", "message": null },
    "context-memory": { "status": "healthy", "message": null },
    "metrics-collector": { "status": "healthy", "message": null },
    "drift-detector": { "status": "healthy", "message": null }
  },
  "skills": {
    "ieee-gen": {
      "status": "healthy",
      "success_rate": 1.0,
      "last_execution": "ISO",
      "last_status": "success",
      "drift_status": "clean",
      "alerts": []
    },
    "make-software": {
      "status": "warning",
      "success_rate": 0.75,
      "last_execution": "ISO",
      "last_status": "partial",
      "drift_status": "clean",
      "alerts": ["ALERT-001"]
    }
  },
  "active_alerts": [],
  "recommendations": []
}
```

### 2.3 Alert Structure
```json
{
  "id": "ALERT-001",
  "timestamp": "ISO",
  "severity": "warning|critical",
  "source": "metrics-collector",
  "skill_id": "make-software",
  "type": "success_rate_low",
  "message": "Success rate dropped below 80%",
  "value": 0.75,
  "threshold": 0.8,
  "acknowledged": false,
  "resolved": false,
  "resolution_id": null
}
```

## 3. HEALTH CALCULATION

### 3.1 Component Health
```
Para cada meta-skill:
  IF última verificación < 24h AND sin errores → healthy
  ELSE IF última verificación < 48h OR warnings → warning  
  ELSE → critical
```

### 3.2 Skill Health
```
Para cada skill operativo:
  IF success_rate >= 0.9 AND no drift AND no alerts → healthy
  ELSE IF success_rate >= 0.7 OR drift = warning → warning
  ELSE → critical
```

### 3.3 Overall Health
```
IF any component = critical OR any skill = critical → critical
ELSE IF any component = warning OR any skill = warning → warning
ELSE → healthy
```

## 4. OPERATIONS

### 4.1 REFRESH
Actualizar estado de salud.

**Proceso:**
```
1. Consultar metrics-collector.getHealthSummary()
2. Consultar drift-detector.getStatus()
3. Consultar execution-logger.getRecentErrors()
4. Calcular health por componente
5. Calcular health por skill
6. Determinar overall_status
7. Generar recommendations
8. Persistir en health_status.json
```

### 4.2 CHECK_THRESHOLDS
Verificar umbrales y generar alertas.

**Umbrales configurables (thresholds.json):**
```json
{
  "success_rate": { "warning": 0.8, "critical": 0.5 },
  "avg_duration_ms": { "warning": 60000, "critical": 120000 },
  "error_rate": { "warning": 0.2, "critical": 0.5 },
  "drift_age_hours": { "warning": 24, "critical": 48 },
  "stale_skill_days": { "warning": 7, "critical": 30 }
}
```

### 4.3 ALERT
Crear nueva alerta.

**Proceso:**
```
1. Crear entrada de alerta
2. Agregar a active.json
3. Actualizar skill.alerts[]
4. Incrementar contador de alertas
5. Notificar (si configurado)
```

### 4.4 ACKNOWLEDGE_ALERT
Marcar alerta como vista.

### 4.5 RESOLVE_ALERT
Marcar alerta como resuelta.

### 4.6 GENERATE_RECOMMENDATIONS
Generar recomendaciones basadas en estado.

**Ejemplos:**
- Success rate bajo → "Revisar POST_MORTEM.md para patrones de error"
- Drift detectado → "Ejecutar /drift resolve"
- Skill inactivo > 7 días → "Verificar si skill sigue siendo necesario"

## 5. INTEGRATIONS

### 5.1 From Metrics Collector
```javascript
// Recibir actualizaciones de métricas:
healthMonitor.updateFromMetrics(metricsData);
```

### 5.2 From Drift Detector
```javascript
// Recibir estado de drift:
healthMonitor.updateDriftStatus(driftReport);
```

### 5.3 From Execution Logger
```javascript
// Recibir notificación de errores:
healthMonitor.notifyError(skill_id, error);
```

### 5.4 To Orchestrator
```javascript
// Proveer estado para decisiones:
const health = healthMonitor.getStatus();
orchestrator.considerHealth(health);
```

## 6. DASHBOARD OUTPUT

### 6.1 Summary View
```
╔══════════════════════════════════════════╗
║   🏥 ECOSYSTEM HEALTH: ✅ HEALTHY        ║
╠══════════════════════════════════════════╣
║ Components: 5/5 healthy                  ║
║ Skills: 3/3 healthy                      ║
║ Active Alerts: 0                         ║
║ Last Check: 2026-02-05 22:47:00          ║
╚══════════════════════════════════════════╝
```

### 6.2 Skill Detail View
```
📊 Skill: make-software
├── Status: ✅ Healthy
├── Success Rate: 85% (↑ improving)
├── Avg Duration: 45s
├── Last Run: 2h ago (success)
├── Drift: Clean
└── Alerts: None
```

### 6.3 Alert View
```
🚨 Active Alerts (1)

[ALERT-001] ⚠️ WARNING
  Skill: make-software
  Type: success_rate_low
  Message: Success rate dropped to 75%
  Since: 2026-02-05 20:00:00
  Action: Review recent error logs
```

## 7. CLI COMMANDS (Conceptuales)

```bash
# Ver estado general
/health

# Ver estado detallado
/health verbose

# Ver alertas
/health alerts

# Ver skill específico
/health skill make-software

# Forzar refresh
/health refresh

# Acknowledgar alerta
/health ack ALERT-001
```

## 8. NOTIFICATION HOOKS

### 8.1 Alert Triggers
- Nueva alerta critical → Notificar inmediatamente
- Nueva alerta warning → Agregar a cola
- Skill degraded → Notificar

### 8.2 Recovery Triggers  
- Alerta auto-resuelta → Registrar resolución
- Skill recovered → Actualizar estado

## 9. GUARDRAILS

1. **REFRESH RATE:** Mínimo 5 minutos entre refreshes automáticos.
2. **ALERT FATIGUE:** No crear alertas duplicadas para el mismo issue.
3. **AUTO-RESOLVE:** Alertas se resuelven automáticamente cuando la condición mejora.
4. **HISTÓRICO:** Mantener historial de alertas por 30 días.

## 10. INITIAL STATE

```json
{
  "timestamp": "2026-02-05T22:47:00-03:00",
  "overall_status": "healthy",
  "uptime_percentage": 100.0,
  "components": {
    "skill-registry": { "status": "healthy" },
    "execution-logger": { "status": "healthy" },
    "context-memory": { "status": "healthy" },
    "metrics-collector": { "status": "healthy" },
    "drift-detector": { "status": "healthy" }
  },
  "skills": {
    "ieee-gen": { "status": "healthy", "success_rate": 0, "alerts": [] },
    "make-software": { "status": "healthy", "success_rate": 0, "alerts": [] },
    "privilegios-engine": { "status": "healthy", "success_rate": 0, "alerts": [] }
  },
  "active_alerts": [],
  "recommendations": ["Execute skills to start collecting metrics"]
}
```
