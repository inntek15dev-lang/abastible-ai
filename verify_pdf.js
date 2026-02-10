const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:4000/api';
let token = '';
let registroId = 1;

async function login(email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || res.statusText);
        token = data.token;
        console.log(`✅ Login successful for ${email}`);
        return token;
    } catch (error) {
        console.error(`❌ Login failed for ${email}:`, error.message);
        process.exit(1);
    }
}

async function verifyPdfGeneration() {
    console.log('\n--- Verifying PDF Generation ---');
    await login('admin@abastible.cl', 'User123*'); // Admin can view any register

    try {
        const res = await fetch(`${API_URL}/reportes/registro/${registroId}/pdf`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        const contentType = res.headers.get('content-type');
        console.log(`✅ Content-Type received: ${contentType}`);

        if (contentType !== 'application/pdf') {
            throw new Error('Response is not a PDF');
        }

        const buffer = await res.arrayBuffer();
        const outputPath = path.join(__dirname, 'test_report.pdf');
        fs.writeFileSync(outputPath, Buffer.from(buffer));

        console.log(`✅ PDF downloaded successfully to ${outputPath} (${buffer.byteLength} bytes)`);

    } catch (err) {
        console.error('❌ PDF Generation Failed:', err.message);
    }
}

verifyPdfGeneration();
