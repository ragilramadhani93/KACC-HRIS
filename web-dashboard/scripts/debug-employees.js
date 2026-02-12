/**
 * Debug: Check what employee photos look like in the database
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

    const employees = await prisma.employee.findMany({
        select: {
            id: true,
            name: true,
            userCode: true,
            photoUrl: true,
            faceDescriptor: true,
        }
    });

    console.log(`Total employees: ${employees.length}\n`);
    for (const emp of employees) {
        const photoLen = emp.photoUrl ? emp.photoUrl.length : 0;
        const photoPrefix = emp.photoUrl ? emp.photoUrl.substring(0, 50) : '(empty)';
        const hasDescriptor = emp.faceDescriptor ? 'YES' : 'NO';
        console.log(`${emp.userCode} | ${emp.name}`);
        console.log(`  Photo: ${photoLen} chars | Prefix: ${photoPrefix}...`);
        console.log(`  Descriptor: ${hasDescriptor}`);
        console.log();
    }

    await prisma.$disconnect();
}

main().catch(console.error);
