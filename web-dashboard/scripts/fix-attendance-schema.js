/**
 * Fix Attendance schema by adding missing location column
 * Run with: node scripts/fix-attendance-schema.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(client);
    const prisma = new PrismaClient({ adapter });

    console.log('Connected to Turso. Checking Attendance table...');

    try {
        console.log('Adding "location" column to "Attendance" table...');
        await prisma.$executeRawUnsafe('ALTER TABLE Attendance ADD COLUMN "location" TEXT');
        console.log('✓ Column "location" added successfully!');
    } catch (e) {
        if (e.message && e.message.includes('duplicate column')) {
            console.log('✓ Column "location" already exists.');
        } else {
            console.error('Error adding column:', e.message);
        }
    }

    await prisma.$disconnect();
}

main().catch(console.error);
