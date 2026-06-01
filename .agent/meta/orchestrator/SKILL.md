---
name: Orchestrator
description: Central coordinator for all meta-skills, managing execution flow and improvement cycles
triggers: ["session start", "skill execution request", "improvement cycle", "system event"]
---

# ROLE: ORCHESTRATOR
# AUTHORITY: Meta-Level Supreme Coordinator
# OBJECTIVE: Coordinate the entire meta-skill ecosystem for optimal operation

## 1. MISSION
Coordinar todos los meta-skills del ecosistema nivel 6, gestionando flujos de ejecución, ciclos de mejora, y asegurando que todas las partes trabajan en armonía. El orchestrator es el **cerebro central** del sistema.

## 2. DATA STRUCTURES

### 2.1 Orchestrator Location
```
.agent/meta/orchestrator/
├── SKILL.md                    # Este archivo
├── workflows/
│   ├── skill_execution.workflow
│   ├── improvement_cycle.workflow
│   ├── daily_maintenance.workflow
│   └── emergency_response.workflow
├── state/
│   └── current_state.json      # Estado actual del sistema
├── queue/
│   └── pending_actions.json    # Acciones pendientes
└── config.json                 # Configuración del orchestrator
```

### 2.2 System State Structure
```json
{
  "timestamp": "ISO",
  "mode": "normal|maintenance|emergency|learning",
  "active_workflow": null,
  "active_skill": null,
  "pending_actions": [],
  "recent_decisions": [],
  "health_summary": {
    "overall": "healthy",
    "skills": {},
    "meta_skills": {}
  },
  "improvement_cycle": {
    "phase": "idle|observing|analyzing|proposing|applying",
    "current_focus": null,
    "last_cycle": "ISO"
  }
}
```

### 2.3 Workflow Structure
```yaml
name: skill_execution
description: Standard flow for executing a skill
triggers:
  - skill_request
  - /skill-name command
steps:
  - id: pre_check
    action: drift_detector.preExecutionCheck
    on_failure: abort
  
  - id: get_strategy
    action: strategy_optimizer.evaluateContext
    
  - id: load_knowledge
    action: context_memory.getRelevantKnowledge
    
  - id: execute
    action: execute_skill
    with_strategy: $get_strategy.result
    with_knowledge: $load_knowledge.result
    
  - id: log
    action: execution_logger.logEnd
    
  - id: evaluate
    action: self_evaluator.evaluate
    
  - id: collect_metrics
    action: metrics_collector.ingest
    
  - id: check_patterns
    action: pattern_recognizer.analyzeExecution
    condition: $execute.status == failure
```

## 3. ORCHESTRATION MODES

### 3.1 Normal Mode
Operación estándar con todos los checks habilitados.

### 3.2 Maintenance Mode
Ejecuta workflows de mantenimiento:
- Limpieza de logs antiguos
- Consolidación de conocimiento
- Verificación de drift
- Actualización de métricas agregadas

### 3.3 Emergency Mode
Activado cuando:
- Success rate cae dramáticamente
- Múltiples skills fallan consecutivamente
- Se detecta drift crítico

Acciones:
- Pausar ejecuciones no críticas
- Activar logging verbose
- Notificar para intervención humana

### 3.4 Learning Mode
Ejecuta ciclo de mejora activo:
- Analizar patrones recientes
- Proponer mutaciones
- Ejecutar A/B tests

## 4. WORKFLOWS

### 4.1 Skill Execution Workflow
```
┌─────────────┐
│  REQUEST    │
└──────┬──────┘
       ▼
┌─────────────┐     ┌─────────────┐
│ PRE-CHECK   │────▶│   ABORT     │
│ (drift)     │ fail└─────────────┘
└──────┬──────┘
       │ pass
       ▼
┌─────────────┐
│ GET STRATEGY│
└──────┬──────┘
       ▼
┌─────────────┐
│LOAD KNOWLEDGE│
└──────┬──────┘
       ▼
┌─────────────┐
│  EXECUTE    │
└──────┬──────┘
       ▼
┌─────────────┐
│    LOG      │
└──────┬──────┘
       ▼
┌─────────────┐
│  EVALUATE   │
└──────┬──────┘
       ▼
┌─────────────┐
│   METRICS   │
└──────┬──────┘
       ▼
┌─────────────┐
│  PATTERNS?  │
└─────────────┘
```

### 4.2 Improvement Cycle Workflow
```
┌─────────────┐
│   START     │
└──────┬──────┘
       ▼
┌─────────────┐
│   OBSERVE   │◀──────────────────────┐
│ (collect    │                       │
│  metrics)   │                       │
└──────┬──────┘                       │
       ▼                              │
┌─────────────┐                       │
│   ANALYZE   │                       │
│ (patterns)  │                       │
└──────┬──────┘                       │
       ▼                              │
┌─────────────┐     ┌─────────────┐   │
│  PROPOSE    │────▶│   SKIP      │───┤
│ (mutations) │ none└─────────────┘   │
└──────┬──────┘                       │
       │ has proposals                │
       ▼                              │
┌─────────────┐                       │
│   APPLY     │                       │
│ (with A/B)  │                       │
└──────┬──────┘                       │
       │                              │
       └──────────────────────────────┘
```

### 4.3 Daily Maintenance Workflow
```yaml
steps:
  - action: health_monitor.refresh
  - action: drift_detector.fullScan
  - action: metrics_collector.aggregate
  - action: pattern_recognizer.analyze
  - action: knowledge_distiller.process
  - action: execution_logger.archive
```

## 5. OPERATIONS

### 5.1 COORDINATE_EXECUTION
Orquestar ejecución de un skill.

**Proceso:**
```
1. Recibir solicitud de ejecución
2. Cargar workflow skill_execution
3. Ejecutar cada paso en secuencia
4. Manejar errores según workflow
5. Registrar resultado
```

### 5.2 RUN_IMPROVEMENT_CYCLE
Ejecutar ciclo de mejora continua.

**Trigger:** Manual o scheduled (diario)

### 5.3 HANDLE_EMERGENCY
Responder a situación de emergencia.

**Proceso:**
```
1. Detectar condición de emergencia
2. Cambiar a emergency mode
3. Ejecutar workflow emergency_response
4. Notificar para intervención
5. Esperar resolución
6. Volver a normal mode
```

### 5.4 MAINTAIN
Ejecutar tareas de mantenimiento.

## 6. DECISION MAKING

### 6.1 Execution Decisions
```javascript
async function decideExecution(skill_id) {
  // 1. Verificar salud del skill
  const health = await healthMonitor.getSkillHealth(skill_id);
  if (health.status === 'critical') {
    return { proceed: false, reason: 'Skill is unhealthy' };
  }
  
  // 2. Verificar drift
  const drift = await driftDetector.preExecutionCheck(skill_id);
  if (drift.hasCriticalDrift) {
    return { proceed: false, reason: 'Critical drift detected' };
  }
  
  // 3. Obtener estrategia
  const strategy = await strategyOptimizer.evaluateContext(skill_id);
  
  return { proceed: true, strategy };
}
```

### 6.2 Improvement Decisions
```javascript
async function decideImprovement() {
  // 1. Obtener patrones sin resolver
  const patterns = await patternRecognizer.getUnresolvedPatterns();
  
  // 2. Priorizar por impacto
  const prioritized = patterns.sort((a, b) => 
    b.impact.blocked_executions - a.impact.blocked_executions
  );
  
  // 3. Proponer mutations para top N
  for (const pattern of prioritized.slice(0, 3)) {
    await skillMutator.propose(pattern);
  }
}
```

## 7. INTEGRATIONS

### 7.1 All Meta-Skills
El orchestrator se integra con TODOS los meta-skills:
- skill-registry: Consultar skills disponibles
- execution-logger: Registrar ejecuciones
- context-memory: Cargar/guardar contexto
- metrics-collector: Obtener métricas
- drift-detector: Verificar sincronización
- health-monitor: Estado del sistema
- pattern-recognizer: Patrones detectados
- skill-mutator: Proponer cambios
- ab-tester: Experimentación
- self-evaluator: Calidad de outputs
- strategy-optimizer: Optimización
- knowledge-distiller: Conocimiento

## 8. CLI COMMANDS (Conceptuales)

```bash
# Ver estado del sistema
/orchestrator status

# Ejecutar skill con orquestación completa
/orchestrator execute make-software

# Ejecutar ciclo de mejora
/orchestrator improve

# Ejecutar mantenimiento
/orchestrator maintain

# Cambiar modo
/orchestrator mode emergency

# Ver workflows
/orchestrator workflows
```

## 9. SAMPLE STATUS

```
╔══════════════════════════════════════════════╗
║   🎯 ORCHESTRATOR STATUS                     ║
╠══════════════════════════════════════════════╣
║ Mode: NORMAL                                 ║
║ Active Workflow: None                        ║
║ Active Skill: None                           ║
║ System Health: ✅ HEALTHY                    ║
╚══════════════════════════════════════════════╝

Meta-Skills Status:
  ✅ skill-registry      READY
  ✅ execution-logger    READY
  ✅ context-memory      READY
  ✅ metrics-collector   READY
  ✅ drift-detector      READY
  ✅ health-monitor      READY
  ✅ pattern-recognizer  READY
  ✅ skill-mutator       READY
  ✅ ab-tester           READY
  ✅ self-evaluator      READY
  ✅ strategy-optimizer  READY
  ✅ knowledge-distiller READY

Improvement Cycle:
  Phase: IDLE
  Last Cycle: 2 hours ago
  Pending Mutations: 0
  Active Experiments: 0

Pending Actions: 0
```

## 10. GUARDRAILS

1. **NO EJECUTAR SIN PRE-CHECK:** Siempre verificar antes de ejecutar skill.
2. **RESPETAR HEALTH:** No ejecutar skills en estado crítico.
3. **LOGGING OBLIGATORIO:** Toda ejecución debe ser loggeada.
4. **HUMAN IN THE LOOP:** Decisiones críticas requieren confirmación.
5. **GRACEFUL DEGRADATION:** Si un meta-skill falla, continuar con los demás.
