---
name: Knowledge Distiller
description: Extracts and consolidates learnings from execution history into actionable knowledge
triggers: ["pattern confirmed", "post-mortem analysis", "knowledge consolidation cycle", "manual distillation"]
---

# ROLE: KNOWLEDGE DISTILLER
# AUTHORITY: Meta-Level Meta-Cognition
# OBJECTIVE: Transform raw experience into structured, reusable knowledge

## 1. MISSION
Extraer conocimiento de la experiencia acumulada (logs, post-mortems, patrones, soluciones) y destilarlo en formas reutilizables: guardrails, anti-patrones, best practices, y nuevos skills.

## 2. DATA STRUCTURES

### 2.1 Distiller Location
```
.agent/meta/knowledge-distiller/
├── SKILL.md                    # Este archivo
├── distillations/
│   └── YYYY-MM-DD/
│       └── dist_{id}.json      # Destilaciones por fecha
├── templates/
│   ├── guardrail_template.md
│   ├── anti_pattern_template.md
│   └── skill_template.md
└── queue/
    └── pending_sources.json    # Fuentes pendientes de destilar
```

### 2.2 Distillation Structure
```json
{
  "id": "dist-001",
  "timestamp": "ISO",
  "status": "pending|processed|applied|archived",
  "sources": [
    {
      "type": "pattern",
      "id": "pat-001",
      "contribution": "Error signature"
    },
    {
      "type": "solution",
      "id": "sol-001",
      "contribution": "Resolution approach"
    },
    {
      "type": "post_mortem",
      "path": ".agent/skills/make-software/POST_MORTEM.md",
      "contribution": "Root cause analysis"
    }
  ],
  "outputs": [
    {
      "type": "guardrail",
      "target_skill": "make-software",
      "section": "5.1",
      "content": "...",
      "status": "proposed|applied"
    },
    {
      "type": "anti_pattern",
      "added_to": "context-memory/knowledge_base/anti-patterns.json",
      "id": "anti-003"
    }
  ],
  "learning": {
    "title": "Import Path Resolution in models/",
    "summary": "Rutas relativas deben considerar la ubicación actual del archivo",
    "key_insight": "Desde models/index.js, usar ./ para mismo directorio, ../ para subir",
    "applicable_contexts": ["JavaScript", "Node.js", "require()"]
  }
}
```

## 3. KNOWLEDGE TYPES

### 3.1 Output Types
| Tipo | Destino | Descripción |
|------|---------|-------------|
| `guardrail` | SKILL.md | Regla preventiva en skill |
| `anti_pattern` | anti-patterns.json | Patrón a evitar |
| `best_practice` | domain_knowledge.json | Práctica recomendada |
| `example` | SKILL.md | Ejemplo correcto/incorrecto |
| `new_skill` | .agent/skills/{new}/ | Skill completamente nuevo |

### 3.2 Source Types
| Fuente | Descripción |
|--------|-------------|
| `pattern` | Patrón confirmado de pattern-recognizer |
| `solution` | Solución exitosa de context-memory |
| `post_mortem` | Análisis POST_MORTEM.md |
| `execution_log` | Logs de ejecución relevantes |
| `mutation` | Mutación exitosa de skill-mutator |
| `experiment` | Resultado de A/B test |

## 4. OPERATIONS

### 4.1 QUEUE_FOR_DISTILLATION
Agregar fuente a la cola de destilación.

**Trigger:** Cuando se confirma patrón, se registra solución, etc.

### 4.2 DISTILL
Procesar fuentes y generar conocimiento.

**Proceso:**
```
1. Cargar fuentes de pending_sources.json
2. Para cada fuente:
   a. Extraer información clave
   b. Identificar learnings
   c. Determinar tipo de output apropiado
   d. Generar contenido usando templates
3. Consolidar outputs relacionados
4. Crear distillation record
5. Notificar para aplicación
```

### 4.3 APPLY
Aplicar conocimiento destilado.

**Proceso:**
```
1. Para cada output en distillation:
   SI tipo == 'guardrail':
     → skill-mutator.propose(output)
   SI tipo == 'anti_pattern':
     → context-memory.addAntiPattern(output)
   SI tipo == 'new_skill':
     → Crear archivos y registrar en registry
2. Marcar distillation como applied
```

### 4.4 CONSOLIDATE
Consolidar conocimiento disperso.

**Ejecutar periódicamente para:**
- Fusionar patrones relacionados
- Eliminar duplicados
- Actualizar relevancia

## 5. DISTILLATION ALGORITHMS

### 5.1 Pattern to Guardrail
```javascript
function distillPatternToGuardrail(pattern) {
  return {
    type: 'guardrail',
    content: `
> [!CAUTION]
> **${pattern.name}** (Detected ${pattern.occurrences} times)
> 
> ❌ Don't: ${pattern.signature.bad_example}
> ✅ Do: ${pattern.resolution.good_example}
    `
  };
}
```

### 5.2 Solution to Best Practice
```javascript
function distillSolutionToBestPractice(solution) {
  return {
    id: generateId(),
    title: solution.description,
    applicability: extractContexts(solution),
    steps: extractSteps(solution.resolution),
    success_rate: solution.success_rate
  };
}
```

### 5.3 Post-Mortem to Learnings
```javascript
function distillPostMortem(postMortem) {
  // Parsear secciones del post-mortem
  // Extraer problemas, causas, soluciones
  // Generar anti-patterns y guardrails
}
```

## 6. INTEGRATIONS

### 6.1 From Pattern Recognizer
```javascript
// Cuando se confirma patrón:
knowledgeDistiller.queue({
  type: 'pattern',
  id: pattern.id,
  priority: pattern.severity === 'critical' ? 1 : 2
});
```

### 6.2 From Context Memory
```javascript
// Cuando se registra solución exitosa:
knowledgeDistiller.queue({
  type: 'solution',
  id: solution.id
});
```

### 6.3 To Skill Mutator
```javascript
// Cuando se destila guardrail:
skillMutator.propose(distillation.outputs.find(o => o.type === 'guardrail'));
```

### 6.4 To Context Memory
```javascript
// Cuando se destila anti-pattern:
contextMemory.addAntiPattern(distillation.outputs.find(o => o.type === 'anti_pattern'));
```

## 7. TEMPLATES

### 7.1 Guardrail Template
```markdown
> [!{{SEVERITY}}]
> **{{TITLE}}** ({{OCCURRENCES}} occurrences)
> 
> {{DESCRIPTION}}
> 
> ❌ Incorrect:
> ```{{LANGUAGE}}
> {{BAD_EXAMPLE}}
> ```
> 
> ✅ Correct:
> ```{{LANGUAGE}}
> {{GOOD_EXAMPLE}}
> ```
```

### 7.2 Anti-Pattern Template
```json
{
  "id": "{{ID}}",
  "name": "{{NAME}}",
  "bad_example": "{{BAD}}",
  "good_example": "{{GOOD}}",
  "context": "{{CONTEXT}}",
  "severity": "{{SEVERITY}}",
  "skill_origin": "{{SKILL}}",
  "guardrail_ref": "{{SECTION}}"
}
```

## 8. CLI COMMANDS (Conceptuales)

```bash
# Ver cola de destilación
/distill queue

# Procesar cola
/distill process

# Ver destilaciones recientes
/distill list

# Aplicar destilación
/distill apply dist-001

# Destilar post-mortem específico
/distill post-mortem make-software
```

## 9. SAMPLE DISTILLATION

```
╔══════════════════════════════════════════════╗
║   🧪 DISTILLATION REPORT: dist-001           ║
╠══════════════════════════════════════════════╣
║ Sources Processed: 3                         ║
║ Outputs Generated: 2                         ║
╚══════════════════════════════════════════════╝

Sources:
  📊 Pattern pat-001: Import Path Error
  💡 Solution sol-001: Use relative paths correctly
  📝 POST_MORTEM: make-software lessons

Learning Extracted:
  Title: Import Path Resolution in models/
  Insight: Use ./ for same directory, ../ for parent

Outputs:
  1. [GUARDRAIL] → make-software section 5.1
     Status: Proposed to skill-mutator
  
  2. [ANTI-PATTERN] → anti-003
     Status: Added to knowledge base
```

## 10. GUARDRAILS

1. **CALIDAD SOBRE CANTIDAD:** Mejor pocos learnings de alta calidad.
2. **VALIDACIÓN:** No generar conocimiento de fuentes no confirmadas.
3. **DEDUPLICACIÓN:** Verificar que no existe conocimiento similar antes de crear.
4. **TRAZABILIDAD:** Siempre vincular output con sources originales.
