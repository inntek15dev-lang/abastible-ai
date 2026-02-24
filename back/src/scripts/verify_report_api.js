const axios = require('axios');

const API_URL = 'http://localhost:4000/api';
const EMAIL = 'admin@abastible.cl'; // Assuming default admin
const PASSWORD = 'User123*'; // Assuming default password

async function verifyReportApi() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        console.log('2. Fetching Report Compliance Data...');
        const reportRes = await axios.get(`${API_URL}/reportes/cumplimiento?periodo=2026-02`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Status:', reportRes.status);
        console.log('Data:', JSON.stringify(reportRes.data, null, 2));

        if (reportRes.status === 200 && reportRes.data.success) {
            console.log('VERIFICATION SUCCESS: API is working.');
        } else {
            console.error('VERIFICATION FAILED: Invalid response format.');
        }

    } catch (error) {
        console.error('VERIFICATION FAILED:', error.response ? error.response.data : error.message);
    }
}

verifyReportApi();
