const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar'); // Assuming it's installed, or we fallback to fs.watch

// Configuration
const PORT = 3000;
const BRIDGE_ROOT = path.resolve(__dirname, '../../bridge');
const STATE_FILE = path.join(BRIDGE_ROOT, 'chat_state.json');

// Ensure state file exists
if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
        session_id: Date.now().toString(),
        updated_at: Date.now(),
        messages: []
    }, null, 2));
}

// Setup Server
const app = express();
app.use(cors());
app.use(express.json()); // Support JSON-encoded bodies
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Helper: Read State
function readState() {
    try {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading state:", err);
        return { messages: [] };
    }
}

// Helper: Write State
function writeState(state) {
    try {
        state.updated_at = Date.now();
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        return true;
    } catch (err) {
        console.error("Error writing state:", err);
        return false;
    }
}

// Watch for file changes (Agent updates)
// We use simple fs.watch because functionality is basic
let fsWait = false;
fs.watch(STATE_FILE, (event, filename) => {
    if (filename && event === 'change') {
        if (fsWait) return;
        fsWait = setTimeout(() => {
            fsWait = false;
        }, 100); // Debounce

        console.log('[STATE] External update detected, broadcasting...');
        const state = readState();
        io.emit('state:update', state);
    }
});

// Socket Handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state
    socket.emit('state:update', readState());

    // Handle new messages from Web
    socket.on('chat:message', (msg) => {
        console.log(`[MSG] From Web: ${msg.content}`);

        const state = readState();
        const newMessage = {
            id: msg.id || Date.now().toString(),
            timestamp: Date.now(),
            source: 'web',
            role: 'user',
            content: msg.content,
            processed: false // Flag for Agent to pick up
        };

        state.messages.push(newMessage);
        writeState(state);
        // Broadcast happens automatically via file watch or manual emit if we want instant feedback
        io.emit('state:update', state);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes for Agent to interact (optional convenience)
app.get('/api/state', (req, res) => {
    res.json(readState());
});

app.post('/api/message', (req, res) => {
    // Agent injecting message
    const { role, content, source } = req.body;
    const state = readState();
    state.messages.push({
        id: Date.now().toString(),
        timestamp: Date.now(),
        source: source || 'agent',
        role: role || 'assistant',
        content: content,
        processed: true
    });
    writeState(state);
    io.emit('state:update', state);
    res.json({ success: true });
});

// Start
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Shared State Bridge running on port ${PORT}`);
    console.log(`Mapping State: ${STATE_FILE}`);
});
