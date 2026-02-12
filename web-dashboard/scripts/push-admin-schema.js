/**
 * Push Admin schema to Turso
 * Run with: node scripts/push-admin-schema.js
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

    console.log('Connected to Turso. Creating Admin table...');

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Admin" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "username" TEXT NOT NULL,
                "password" TEXT NOT NULL,
                "name" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL
            )
        `);
        console.log('✓ Table "Admin" created/exists.');

        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username")
        `);
        console.log('✓ Index "Admin_username_key" created/exists.');

    } catch (e) {
        console.error('Error:', e.message);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
