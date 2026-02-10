
---
name: Tutorial Generator
description: Generates interactive tutorials (driver.js) from the Functional Matrix.
---

# Tutorial Generator

This skill analyzes the project's Functional Matrix (`info/MATRIZ_FUNCIONALIDADES_POR_ROL.md`) to generate a JSON manifest of interactive tutorials for the frontend.

## Input
- **Source**: `c:/laragon/www/a-oiem-ai/info/MATRIZ_FUNCIONALIDADES_POR_ROL.md`
- **Format**: Markdown table defining functionalities per role.

## Output
- **Target**: `c:/laragon/www/a-oiem-ai/front/src/data/tutorials.json`
- **Format**: JSON Array of Tutorial Objects.

## JSON Structure
```json
[
  {
    "id": "tutorial-id",
    "title": "Tutorial Title",
    "role": "admin|contratista|administrador_contrato",
    "module": "Modulo Name",
    "steps": [
      {
        "element": "#selector-id",
        "popover": {
          "title": "Step Title",
          "description": "Step Description",
          "side": "left|right|top|bottom"
        },
        "action": {
          "type": "click|input|navigate",
          "value": "optional-value-to-input"
        }
      }
    ]
  }
]
```

## Process
1.  **Parse Markdown**: Extract modules, roles, and functionalities.
2.  **Map to UI**: Correlate functionalities with known UI DOM IDs (e.g., `#btn-new-registro`, `#input-name`).
3.  **Generate Steps**: Create a logical flow for each major functionality (Create, Edit, Audit).
4.  **Write JSON**: Output the result to `front/src/data/tutorials.json`.
