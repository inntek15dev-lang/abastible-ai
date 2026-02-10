const http = require('http');

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', (e) => reject(e));

        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

async function testSprint9() {
    console.log('🚀 Starting Sprint 9 Verification (Attempt 3)...');

    const loginData = { email: 'admin@abastible.cl', password: 'User123*' };
    const loginDataStr = JSON.stringify(loginData);

    const loginOptions = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginDataStr)
        }
    };

    try {
        const loginRes = await request(loginOptions, loginData);

        if (loginRes.data.success) {
            console.log('✅ Login Admin success');
            const token = loginRes.data.token;

            // 2. Test Direct Reopen
            const reopenData = { registro_id: 999999, motivo: 'Test' };
            const reopenDataStr = JSON.stringify(reopenData);

            const reopenOptions = {
                hostname: '127.0.0.1',
                port: 3000,
                path: '/api/reaperturas/directa',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Content-Length': Buffer.byteLength(reopenDataStr)
                }
            };

            const reopenRes = await request(reopenOptions, reopenData);

            if (reopenRes.status === 404) {
                console.log('✅ Direct Reopen Endpoint reachable (404 as expected)');
            } else {
                console.error('❌ Direct Reopen failed:', reopenRes.status, reopenRes.data);
            }

        } else {
            console.error('❌ Login failed:', loginRes.data);
        }
    } catch (e) {
        console.error('❌ Request error detail:', e);
    }
}

testSprint9();
