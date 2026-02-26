---
description: Protocolo de Alta Eficiencia para Misiones Críticas
---

# Protocolo PARKO

1.  **Analizar Contexto (CRITICAL)**
    *   Considerar el texto después de "parko" como la instrucción suprema.
    *   Prioridad máxima sobre cualquier otro contexto anterior.

2.  **Política de Directorio Raíz Limpio (CRITICAL)**
    *   **REGLA DE ORO:** Está ESTRICTAMENTE PROHIBIDO crear, generar o almacenar archivos temporales, scripts de pruba (ej. `debug_*.js`, `verify_*.js`), logs (ej. `*.txt`, `*.log`), volcados de base de datos (`*.sql`) o cualquier otro archivo residual en la RAÍZ del proyecto (`/`).
    *   **UBICACIÓN MANDATORIA:** Cualquier archivo utilitario, temporal o residual generado por el agente debe ser guardado EXCLUSIVAMENTE dentro del directorio `info/agent-residuales/`.
    *   La raíz del proyecto solo debe contener las carpetas funcionales acordadas: `.agent`, `back`, `front`, `info`, `storage`, `.git` y configuraciones estándar como `package.json`, `.env.example` y `.gitignore`.

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

5.  **Auditoría Multifacética de Capas (MANDATORY)**
    *   **Acción:** Ejecutar skill `layer-enforcer` para validar consistencia total.
    *   **Verificación:** Backend, Frontend, Swagger, Env, DB deben estar alineados.
    *   **Condición:** NO proceder al paso 6 si existe alguna inconsistencia.

6.  **Sincronización OBLIGATORIA del Blueprint (SI O SI)**
    *   **Acción:** Al finalizar cualquier ejecución de este protocolo, se DEBE ejecutar la actualización del `master_blueprint.prompt` y `master_blueprint.schema.prompt`.
    *   **Verificación:** No importa si se detectan cambios o no. La actualización es MANDATORIA e INCONDICIONAL.
    *   **Alcance:** Asegurar que los esquemas de datos, endpoints, y reglas de negocio en los blueprints reflejen exactamente el estado actual del código.
    *   **Objetivo:** Garantizar que el Blueprint sea siempre la "Fuente de Verdad" absoluta y sincronizada.
