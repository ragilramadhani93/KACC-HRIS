/**
 * Seed Admin User
 * Run with: node scripts/seed-admin.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

async function main() {
    let prisma;
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
        const client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        const adapter = new PrismaLibSQL(client);
        prisma = new PrismaClient({ adapter });
        console.log('Connected to Turso database');
    } else {
        prisma = new PrismaClient();
        console.log('Connected to local database');
    }

    const username = 'admin';
    const passwordOriginal = 'admin123';
    const hashedPassword = await bcrypt.hash(passwordOriginal, 10);

    const existing = await prisma.admin.findUnique({
        where: { username },
    });

    if (existing) {
        console.log(`Admin user '${username}' already exists. Updating password...`);
        await prisma.admin.update({
            where: { username },
            data: { password: hashedPassword },
        });
        console.log('Password updated.');
    } else {
        console.log(`Creating admin user '${username}'...`);
        await prisma.admin.create({
            data: {
                username,
                password: hashedPassword,
                name: 'Super Admin',
            },
        });
        console.log('User created.');
    }

    console.log(`\nCredentials:`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${passwordOriginal}`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
