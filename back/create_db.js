require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDb() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || ''
    });

    const dbName = 'abastible_ai';
    console.log(`Checking database: ${dbName}...`);

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database ${dbName} created or already exists.`);

    await connection.end();
}

createDb().catch(err => {
    console.error('Failed to create DB:', err);
    process.exit(1);
});
