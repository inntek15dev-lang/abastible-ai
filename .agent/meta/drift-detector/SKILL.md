---
name: Drift Detector
description: Detects synchronization issues between artifacts, code, and database state
triggers: ["pre-execution check", "post-deployment", "manual validation", "scheduled scan"]
---

# ROLE: DRIFT DETECTOR
# AUTHORITY: Meta-Level Observability
# OBJECTIVE: Detect and report desynchronization between system artifacts

## 1. MISSION
Detectar desincronización (drift) entre diferentes capas del sistema:
- Blueprint vs Código generado
- Código vs Base de datos
- roles.json vs Privilegios en BD
- Registry vs Skills en disco

## 2. DATA STRUCTURES

### 2.1 Detector Location
```
.agent/meta/drift-detector/
├── SKILL.md               # Este archivo
├── rules/
│   ├── blueprint.rules    # Reglas blueprint<->code
│   ├── database.rules     # Reglas code<->db
│   └── registry.rules     # Reglas registry<->disk
├── reports/
│   └── YYYY-MM-DD.json    # Reportes de drift
└── last_scan.json         # Último escaneo
```

### 2.2 Drift Report Structure
```json
{
  "scan_id": "uuid",
  "timestamp": "ISO-8601",
  "status": "clean|drifted|error",
  "summary": {
    "total_checks": 0,
    "passed": 0,
    "drifted": 0,
    "errors": 0
  },
  "drifts": [
    {
      "id": "drift-001",
      "type": "blueprint_code",
      "severity": "warning|critical",
      "source": { "type": "blueprint", "path": "...", "value": "..." },
      "target": { "type": "code", "path": "...", "value": "..." },
      "description": "...",
      "recommendation": "..."
    }
  ]
}
```

## 3. DRIFT TYPES

### 3.1 Blueprint → Code Drift
Detectar cuando el código generado no refleja el blueprint.

**Verificaciones:**
| Check | Source | Target | Severidad |
|-------|--------|--------|-----------|
| Entidades faltantes | blueprint.entities[] | back/src/database/models/ | Critical |
| Campos faltantes | entity.schema[] | Model.js attributes | Warning |
| US sin página | user_stories[] | front/src/pages/ | Warning |
| Rutas faltantes | user_stories[] | back/src/routes/index.js | Critical |

### 3.2 Code → Database Drift
Detectar cuando la BD no refleja el código.

**Verificaciones:**
| Check | Source | Target | Severidad |
|-------|--------|--------|-----------|
| Tablas faltantes | models/*.js | DB tables | Critical |
| Columnas faltantes | model.attributes | DB columns | Critical |
| Índices faltantes | model.indexes | DB indexes | Warning |

### 3.3 Config → Code Drift
Detectar cuando configuraciones no están aplicadas.

**Verificaciones:**
| Check | Source | Target | Severidad |
|-------|--------|--------|-----------|
| Roles faltantes | roles.json | Role seeder | Warning |
| Privilegios faltantes | roles.json.permisos | Privilegio seeder | Warning |
| Navegación descuadrada | roles.json.modulos | navigation.js | Warning |

### 3.4 Registry → Disk Drift
Detectar cuando el registry no refleja el sistema de archivos.

**Verificaciones:**
| Check | Source | Target | Severidad |
|-------|--------|--------|-----------|
| Skill no existe | registry.skills[] | .agent/skills/*/SKILL.md | Critical |
| Skill no registrado | .agent/skills/*/SKILL.md | registry.skills[] | Warning |
| Path incorrecto | registry.skill.path | Archivo real | Critical |

## 4. OPERATIONS

### 4.1 FULL_SCAN
Ejecutar todas las verificaciones.

**Proceso:**
```
1. Cargar reglas de rules/
2. Para cada regla:
   a. Leer source
   b. Leer target
   c. Comparar
   d. Registrar drift si existe
3. Generar reporte
4. Guardar en reports/
5. Actualizar last_scan.json
```

### 4.2 TARGETED_SCAN
Ejecutar verificaciones específicas.

```javascript
// Ejemplo: Solo verificar registry
driftDetector.scan('registry');

// Solo verificar un skill
driftDetector.scanSkill('make-software');
```

### 4.3 PRE_EXECUTION_CHECK
Verificación rápida antes de ejecutar un skill.

**Verificaciones:**
- Inputs del skill existen
- Dependencias fueron ejecutadas
- No hay drifts críticos en entradas

### 4.4 RESOLVE_DRIFT
Intentar resolver un drift automáticamente.

**Resoluciones automáticas:**
- Registry desactualizado → Actualizar registry
- Skill no registrado → Registrar skill
- Config no aplicada → Re-ejecutar seeder (con confirmación)

## 5. RULES FORMAT

### 5.1 Rule Definition
```json
{
  "id": "rule-001",
  "name": "Blueprint entities match models",
  "description": "...",
  "source": {
    "type": "json",
    "path": ".agent/prompts/master_blueprint.prompt",
    "extract": "$.system_blueprint.persistence_architecture.entities[*].table_name"
  },
  "target": {
    "type": "filesystem",
    "path": "back/src/database/models/",
    "pattern": "*.js",
    "extract": "filename_without_ext"
  },
  "comparison": "subset",
  "severity": "critical",
  "auto_resolve": false
}
```

## 6. INTEGRATIONS

### 6.1 Pre-Skill Hook
```javascript
// Antes de ejecutar skill:
const preCheck = await driftDetector.preExecutionCheck(skill_id);
if (preCheck.hasCriticalDrift) {
  throw new DriftError(preCheck.drifts);
}
```

### 6.2 Health Monitor Integration
```javascript
// Reportar estado a health monitor:
const driftStatus = driftDetector.getStatus();
healthMonitor.updateDriftStatus(driftStatus);
```

### 6.3 Scheduled Scans
```
Configuración recomendada:
- Full scan: Diario (00:00)
- Registry scan: Cada inicio de sesión
- Pre-execution: Antes de cada skill
```

## 7. CLI COMMANDS (Conceptuales)

```bash
# Escaneo completo
/drift scan

# Escaneo específico
/drift scan registry
/drift scan blueprint

# Ver último reporte
/drift report

# Resolver drift específico
/drift resolve drift-001

# Ver reglas activas
/drift rules
```

## 8. SEVERITY LEVELS

| Nivel | Acción | Ejemplo |
|-------|--------|---------|
| `info` | Solo registrar | Archivo extra no en blueprint |
| `warning` | Notificar | Campo opcional faltante |
| `critical` | Bloquear ejecución | Tabla requerida no existe |

## 9. GUARDRAILS

1. **NO MODIFICAR AUTOMÁTICAMENTE:** Drifts críticos requieren confirmación humana.
2. **PRESERVAR HISTÓRICO:** Guardar todos los reportes para análisis de tendencias.
3. **NO BLOQUEAR SIN RAZÓN:** Solo bloquear en severidad `critical`.
4. **FALSOS POSITIVOS:** Mantener whitelist de excepciones conocidas.

## 10. SAMPLE OUTPUT

```
🔍 Drift Scan Report - 2026-02-05

Status: DRIFTED (2 issues)

✅ Registry → Disk: Clean
✅ Blueprint → Code: Clean
⚠️  Config → Code: 1 warning
   - roles.json defines 4 roles, seeder has 3

❌ Code → Database: 1 critical
   - Table 'evidencias' defined in model but not in DB
   - Recommendation: Run migrations or sync

Next steps:
1. Run: cd back && npm run migrate
2. Re-scan: /drift scan database
```
