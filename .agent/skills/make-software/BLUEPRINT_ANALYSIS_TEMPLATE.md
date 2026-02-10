# Template: Análisis Blueprint vs Implementación

Este es un template para analizar la cobertura del blueprint después de ejecutar el skill make-software.

---

## I. Extracción del Blueprint

### User Stories Definidas
Extraer de `master_blueprint.prompt`:
```
blueprint.agile_layer.user_stories.forEach(us => {
  console.log(`${us.id}: ${us.role} - ${us.action}`);
  console.log(`  Criteria: ${us.acceptance_criteria.join(', ')}`);
});
```

### Entidades de BD Definidas
Extraer de `blueprint.persistence_architecture.entities[]`:
- Listar cada `table_name`
- Ordenar por `execution_order_index`

---

## II. Checklist de Verificación

### Backend
| Verificación | Estado | Comando |
|--------------|--------|---------|
| Modelos creados | [ ] | `ls back/src/database/models/` |
| Controllers por entidad | [ ] | `ls back/src/controllers/` |
| Rutas definidas | [ ] | `grep -r "router" back/src/routes/` |
| Seed funciona | [ ] | `cd back && npm run seed` |
| Server inicia | [ ] | `cd back && npm run dev` |

### Frontend  
| Verificación | Estado | Comando |
|--------------|--------|---------|
| Página por US | [ ] | `ls front/src/pages/` |
| Sin PlaceholderPage | [ ] | `grep -r "PlaceholderPage" front/src/` |
| Build pasa | [ ] | `cd front && npm run build` |

---

## III. Cobertura de User Stories

| US-ID | Páginas Generadas | Estado |
|-------|------------------|--------|
| [US-XXX] | [Lista de .jsx] | ✅/❌ |

### Fórmula de Cobertura
```
Cobertura = (US con páginas funcionales / Total US) * 100
```

---

## IV. Gaps Identificados

Para cada gap encontrado:

### GAP: [Nombre del Gap]
- **Prioridad:** P0/P1/P2
- **Blueprint exige:** [Requisito del blueprint]
- **Realidad:** [Estado actual]
- **Componentes faltantes:** [Lista]

---

## V. Acciones Correctivas

| Gap | Archivos a Crear | Prioridad |
|-----|-----------------|-----------|
| [Gap 1] | [archivo1.jsx, archivo2.js] | P0 |

---

## VI. Métricas Finales

| Métrica | Valor |
|---------|-------|
| Entidades implementadas | X/Y (Z%) |
| User Stories completadas | X/Y (Z%) |
| Páginas funcionales | X |
| Páginas placeholder | X |
| Cobertura total | Z% |
