const fs = require('fs');
const path = require('path');

// Configuration
const BRIDGE_ROOT = path.resolve(__dirname, '../../bridge');
const STATE_FILE = path.join(BRIDGE_ROOT, 'chat_state.json');

// Helper: Read State
function readState() {
    try {
        if (!fs.existsSync(STATE_FILE)) return null;
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading state:", err);
        return null;
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

// Command Handling
const command = process.argv[2];
const payload = process.argv.slice(3).join(' ');

async function main() {
    if (!command) {
        console.log("Usage: node sync.js [fetch|reply] [content]");
        return;
    }

    const state = readState();
    if (!state) {
        console.error("State file not found or invalid.");
        process.exit(1);
    }

    if (command === 'fetch') {
        const pending = state.messages.filter(m => m.source === 'web' && m.role === 'user' && !m.processed);
        if (pending.length === 0) {
            console.log("No new messages.");
        } else {
            console.log(JSON.stringify(pending, null, 2));
        }
    }
    else if (command === 'reply') {
        if (!payload) {
            console.error("Error: Reply content required.");
            return;
        }

        // 1. Mark pending messages as processed
        let marked = 0;
        state.messages.forEach(m => {
            if (m.source === 'web' && m.role === 'user' && !m.processed) {
                m.processed = true;
                marked++;
            }
        });

        // 2. Add Agent Response
        const newMessage = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            source: 'ide',
            role: 'assistant',
            content: payload,
            processed: true
        };
        state.messages.push(newMessage);

        // 3. Save
        if (writeState(state)) {
            console.log(`Response sent. Marked ${marked} messages as processed.`);
        } else {
            console.error("Failed to write to state file.");
        }
    } else {
        console.log(`Unknown command: ${command}`);
    }
}

main();
