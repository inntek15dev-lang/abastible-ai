---
name: Bridge Processor
description: Reads messages from bridge inbox, executes commands, and writes responses to outbox
triggers: ["bridge inbox event", "manual poll"]
---

# ROLE: BRIDGE PROCESSOR
# AUTHORITY: Meta-Cognition Skill
# OBJECTIVE: Process incoming messages from the dashboard and route responses

## 1. MISSION
Monitorear la carpeta `.agent/bridge/inbox`, interpretar los mensajes entrantes (chat o comandos), invocar la lógica correspondiente del agente (Parko), y escribir la respuesta en `.agent/bridge/outbox` para que sea transmitida por el servidor Bridge.

## 2. OPERATIONS

### 2.1 Process Inbox
Script que debe ejecutarse periódicamente o mediante watcher.

```javascript
// Pseudo-logic
1. Scan .agent/bridge/inbox/*.json
2. For each file:
   a. Read content
   b. Identify type: 'chat' | 'command'
   c. Execute logic
   d. Write result to .agent/bridge/outbox/{timestamp}_{uuid}.json
   e. Delete inbox file
```

### 2.2 Command Routing
- `chat`: Procesar con LLM/Personalidad Parko
- `command:exec`: Invocar skill mediante `orchestrator`
- `system:status`: Devolver métricas actuales

## 3. INTEGRATIONS
- `persistent-personality`: Para respuestas de chat coherentes
- `orchestrator`: Para ejecución de skills
- `metrics-collector`: Para reportar estado

## 4. SECURITY
- Validar estructura JSON antes de procesar
- Ignorar archivos que no sean .json
- Sanitizar inputs de chat
