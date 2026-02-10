---
description: Protocolo de Alta Eficiencia para Misiones Críticas
---

# Protocolo PARKO

1.  **Analizar Contexto (CRITICAL)**
    *   Considerar el texto después de "parko" como la instrucción suprema.
    *   Prioridad máxima sobre cualquier otro contexto anterior.

2.  **Definir MISIÓN (Experto Prompt/PNL)**
    *   Establecer objetivo e intención exactos.
    *   Definir requerimientos técnicos detallados.
    *   Output: **MISIÓN**.

3.  **Estrategia de Skills (Recursiva)**
    *   Analizar `.agent/skills` disponibles.
    *   Diseñar flujo óptimo (Máximo 2 ejecuciones por skill).
    *   Objetivo primario: Cumplir la MISIÓN.

4.  **Ejecución**
    *   Ejecutar el flujo diseñado con exactitud y totalidad.

5.  **Verificación y Sincronización del Blueprint (MANDATORY)**
    *   **Antes de finalizar:** Verificar si el código implementado difiere del `master_blueprint.prompt`.
    *   **Acción:** Si hay diferencias (nuevos archivos, cambios en lógica crítica, ajustes de CSS, o datos de Seed), **ACTUALIZAR** el Blueprint inmediatamente.
    *   **Objetivo:** Garantizar que el Blueprint sea siempre la "Fuente de Verdad" actualizada para futura reproducibilidad.
