/**
 * Push schema changes to Turso (add faceDescriptor column)
 * Run with: node scripts/push-schema.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
    const adapter = new PrismaLibSql({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const prisma = new PrismaClient({ adapter });

    console.log('Connected to Turso. Adding faceDescriptor column...');

    try {
        await prisma.$executeRawUnsafe('ALTER TABLE Employee ADD COLUMN faceDescriptor TEXT');
        console.log('✓ Column "faceDescriptor" added successfully!');
    } catch (e) {
        if (e.message && e.message.includes('duplicate column')) {
            console.log('✓ Column "faceDescriptor" already exists.');
        } else {
            console.error('Error:', e.message);
        }
    }

    await prisma.$disconnect();
}

main().catch(console.error);
