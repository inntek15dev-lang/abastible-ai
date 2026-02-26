const axios = require('axios');

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    validateStatus: () => true
});

async function run() {
    console.log('🔍 Verifying Sprint 4: Visuals & Notifications (Root Path)...');

    try {
        // 1. Mock Login
        const login = await api.post('/auth/login', { email: 'admin@abastible.cl', password: 'password123' });
        const token = login.data.token;

        if (!token) {
            console.error('❌ Login failed:', login.data);
            return;
        }
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Login successful');

        // 2. Test Historical Endpoint
        console.log('\nTesting /dashboard/historico...');
        const hist = await api.get('/dashboard/historico', authHeaders);

        if (hist.data.success && Array.isArray(hist.data.data)) {
            console.log(`✅ Historical Data Received: ${hist.data.data.length} months`);
            console.table(hist.data.data);
        } else {
            console.error('❌ Failed to get historical data:', hist.data);
        }

        // 3. Test Dashboard KPIs (Regression)
        const kpis = await api.get('/dashboard/kpis', authHeaders);
        if (kpis.data.success) {
            console.log('✅ KPIs Endpoint OK');
        } else {
            console.error('❌ KPIs Endpoint Failed');
        }

        console.log('\n✅ Verification Complete.');

    } catch (err) {
        console.error('❌ Script Error:', err.message);
    }
}

run();
