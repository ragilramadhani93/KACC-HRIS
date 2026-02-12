/**
 * Check Attendance table columns
 * Run with: node scripts/check-columns.js
 */
require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('Connected to Turso. Checking columns for Attendance table...');

    try {
        const result = await client.execute('PRAGMA table_info(Attendance)');
        console.log('Columns in Attendance table:');
        result.rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });
    } catch (e) {
        console.error('Error checking columns:', e.message);
    }
}

main().catch(console.error);
