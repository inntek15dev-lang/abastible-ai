---
description: Comando multimodal para soporte técnico basado en imágenes (UI/Terminal)
---

# Workflow: IMG-SOPORTE

Este comando se activa cuando el usuario proporciona una imagen (captura de pantalla, log visual, error de UI) con la intención de recibir soporte técnico.

## Pasos de Ejecución

1. **Decodificación Visual:**
   - Invoca la skill `visual-decoder` para extraer el texto de los logs, el estado de la UI o los mensajes de error presentes en la imagen.
   - Identifica componentes visuales afectados o stack traces visibles.

2. **Activación del Rol SOPORTE:**
   - Una vez extraída la información, activa automáticamente el rol **SOPORTE** utilizando la skill `soporte-engine`.
   - Realiza un Triage basado en la gravedad visual del error (ej: pantalla blanca vs. warning de consola).

3. **Análisis de Causa Raíz (RCA):**
   - Cruza la información visual con el código fuente y el historial de logs del servidor.
   - Identifica si el error es de diseño (UI), lógica (JS/TS) o infraestructura.

4. **Resolución y Refinamiento:**
   - Aplica el fix correspondiente.
   - Refina las skills asociadas (ej: `visual-decoder` si fue un error de diseño, o `soporte-engine` si fue un error lógico) para evitar la recurrencia.

## Ejemplo de Uso
`USER: /img-soporte [adjunta imagen de consola con error EPERM]`
`AGENT: Activando modo SOPORTE multimodal... Analizando captura...`
