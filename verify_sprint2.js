const API_URL = 'http://localhost:4000/api';
let token = '';
let registroId = 1; // Assuming seed data
let hallazgoId = null;

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

async function verifyHallazgoLifecycle() {
    console.log('\n--- Verifying Hallazgo Lifecycle ---');

    // 1. Auditor creates Hallazgo
    await login('ana.auditora@abastible.cl', 'User123*');
    try {
        const res = await fetch(`${API_URL}/hallazgos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                registro_id: registroId,
                auditor_id: 6, // Ana
                descripcion: 'Hallazgo Test Sprint 2 (Fetch)',
                tipo: 'no_conformidad',
                estado: 'abierto'
            })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || res.statusText);

        hallazgoId = data.data.id;
        console.log(`✅ Hallazgo Created: ID ${hallazgoId}`);
    } catch (err) {
        console.error('❌ Create Hallazgo Failed:', err.message);
    }

    // 2. Contractor creates Compromiso
    console.log('\n--- Verifying Compromiso Lifecycle ---');
    await login('contratista@demo.cl', 'User123*');
    try {
        const res = await fetch(`${API_URL}/compromisos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                hallazgo_id: hallazgoId,
                descripcion: 'Plan de acción correctiva S2 (Fetch)',
                fecha_cumplimiento: '2026-12-31'
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || res.statusText);

        console.log(`✅ Compromiso Created: ID ${data.data.id}`);
    } catch (err) {
        console.error('❌ Create Compromiso Failed:', err.message);
    }

    // 3. Auditor Closes Hallazgo
    console.log('\n--- Verifying Auditor Closure ---');
    await login('ana.auditora@abastible.cl', 'User123*');
    try {
        const res = await fetch(`${API_URL}/hallazgos/${hallazgoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                estado: 'cerrado'
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || res.statusText);

        console.log(`✅ Hallazgo Closed via PUT`);
    } catch (err) {
        console.error('❌ Close Hallazgo Failed:', err.message);
    }
}

verifyHallazgoLifecycle();
