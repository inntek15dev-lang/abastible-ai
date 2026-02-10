---
name: Agent API Bridge
description: Provides a WebSocket interface to connect external UIs with the agent via file-based bus
triggers: ["bridge start", "dashboard connection"]
---

# ROLE: AGENT API BRIDGE
# AUTHORITY: Infrastructure Skill
# OBJECTIVE: Enable real-time communication between Web Dashboard and Agent

## 1. MISSION
Levantar un servidor local (Express + Socket.io) que actúe como puente bidireccional entre clientes web (Dashboard) y el núcleo del agente, utilizando un sistema de mensajería basado en archivos (File-Based Bus) para sortear el aislamiento de procesos.

## 2. INFRASTRUCTURE

- **Port:** 3000
- **Protocol:** WebSocket (Socket.io) + HTTP
- **Bus Path:** `.agent/bridge/`
  - `inbox/`: Mensajes entra (Dashboard -> Agent)
  - `outbox/`: Mensajes salen (Agent -> Dashboard)

## 3. OPERATIONS

### 3.1 Start Server
Comando para iniciar el puente.
```bash
node .agent/skills/agent-api-bridge/server.js
```

### 3.2 Message Flow
1. **Client -> Server:** `socket.emit('chat:message', payload)`
2. **Server -> Bus:** Write payload to `inbox/{timestamp}_{uuid}.json`
3. **Agent -> Bus:** Read inbox, process, write to `outbox/{timestamp}_{uuid}.json`
4. **Server -> Client:** Watch `outbox`, read new file, `socket.emit('chat:response', payload)`

## 4. API CONTRACT

### 4.1 Chat Payload
```json
{
  "id": "uuid-v4",
  "type": "chat",
  "content": "User message string",
  "timestamp": 1234567890
}
```

### 4.2 Response Payload
```json
{
  "reply_to": "uuid-v4",
  "type": "text",
  "content": "Agent response string",
  "timestamp": 1234567900
}
```

## 5. DEPENDENCIES
- `express`
- `socket.io`
- `cors`
- `chokidar` (para file watching eficiente)

## 6. SECURITY
- **Localhost Binding:** Server must listen only on 127.0.0.1
- **Path Traversal Prevention:** Validate filenames in bus operations
