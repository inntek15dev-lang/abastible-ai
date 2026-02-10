---
name: Sync Chat
description: Interfaces with the Shared Chat State to fetch user messages and post agent responses
triggers: ["manual invocation", "new message alert"]
---

# ROLE: SYNC CHAT INTERFACE
# AUTHORITY: Communication Skill
# OBJECTIVE: Enable the Agent to converse with the Web Dashboard user

## 1. MISSION
Actuar como la "boca" y los "oídos" del Agente en el entorno del Dashboard Web. Esta skill lee los mensajes que el usuario escribe en la web (y que están en cola en `chat_state.json`) y permite al Agente inyectar sus respuestas en el mismo flujo.

## 2. COMMANDS

### 2.1 Fetch Pending Messages
Lee mensajes del usuario que aún no han sido procesados (`processed: false`).
```bash
node .agent/skills/sync-chat/sync.js fetch
```
**Output:** JSON array de mensajes pendientes o "No new messages".

### 2.2 Post Response
Envía una respuesta al chat y marca los mensajes pendientes como procesados.
```bash
node .agent/skills/sync-chat/sync.js reply "El contenido de la respuesta..."
```

## 3. DATA FLOW
1. **Fetch:** `chat_state.json` -> stdout (Agent reads this via run_command)
2. **Reply:** Argument -> `chat_state.json` (Dashboard sees this via WebSocket)

## 4. INTEGRATION
- **Dependency:** `.agent/bridge/chat_state.json` must exist.
- **Bridge:** Relies on `agent-api-bridge` to broadcast the updates made by this skill.
