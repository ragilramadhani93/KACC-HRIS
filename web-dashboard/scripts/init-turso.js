const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
}

const client = createClient({
    url,
    authToken,
});

async function main() {
    console.log('Connecting to Turso...');

    const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS "Employee" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userCode" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "department" TEXT,
        "photoUrl" TEXT DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userCode_key" ON "Employee"("userCode");`,

        `CREATE TABLE IF NOT EXISTS "Outlet" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "address" TEXT,
        "latitude" REAL NOT NULL,
        "longitude" REAL NOT NULL,
        "radius" INTEGER NOT NULL DEFAULT 100,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );`,

        `CREATE TABLE IF NOT EXISTS "Attendance" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "employeeId" TEXT NOT NULL,
        "clockInTime" DATETIME NOT NULL,
        "clockOutTime" DATETIME,
        "photoUrl" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ON_TIME',
        "lateDuration" INTEGER NOT NULL DEFAULT 0,
        "workDuration" INTEGER NOT NULL DEFAULT 0,
        "latitude" REAL,
        "longitude" REAL,
        "locationName" TEXT,
        "outletId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`
    ];

    for (const sql of sqlStatements) {
        try {
            console.log(`Executing: ${sql.substring(0, 50)}...`);
            await client.execute(sql);
            console.log('Success');
        } catch (e) {
            console.error('Error executing SQL:', e);
        }
    }

    console.log('Database initialized successfully!');
}

main().catch(console.error);
