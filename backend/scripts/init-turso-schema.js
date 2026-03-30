import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url?.startsWith("libsql://")) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL must use libsql:// for Turso initialization.");
  process.exit(1);
}

if (!authToken) {
  // eslint-disable-next-line no-console
  console.error("TURSO_AUTH_TOKEN is required for Turso initialization.");
  process.exit(1);
}

const client = createClient({ url, authToken });

const statements = [
  "PRAGMA foreign_keys = ON;",
  `CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "outlets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "radius" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department_id" TEXT,
    "position" TEXT,
    "hourly_rate" DECIMAL,
    "avatar_url" TEXT,
    "face_descriptor" TEXT,
    "fcm_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT 1,
    "address" TEXT,
    "phone_number" TEXT,
    "bank" TEXT,
    "account_number" TEXT,
    "emergency_contact" TEXT,
    "ktp_photo_url" TEXT,
    "outlet_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS "time_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "clock_in" DATETIME NOT NULL,
    "clock_out" DATETIME,
    "break_start" DATETIME,
    "break_end" DATETIME,
    "total_hours" DECIMAL,
    "selfie_url" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "address" TEXT,
    "ip_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS "time_off_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS "outlet_shifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outlet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_overnight" BOOLEAN NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  'CREATE INDEX IF NOT EXISTS "users_department_id_idx" ON "users"("department_id");',
  'CREATE INDEX IF NOT EXISTS "users_outlet_id_idx" ON "users"("outlet_id");',
  'CREATE INDEX IF NOT EXISTS "time_entries_user_id_clock_in_idx" ON "time_entries"("user_id", "clock_in");',
  'CREATE INDEX IF NOT EXISTS "schedules_user_id_day_of_week_idx" ON "schedules"("user_id", "day_of_week");',
  'CREATE INDEX IF NOT EXISTS "outlets_name_idx" ON "outlets"("name");',
  'CREATE INDEX IF NOT EXISTS "outlet_shifts_outlet_id_idx" ON "outlet_shifts"("outlet_id");',
];

async function main() {
  // eslint-disable-next-line no-console
  console.log("Initializing backend schema in Turso...");

  for (const sql of statements) {
    await client.execute(sql);
  }

  // eslint-disable-next-line no-console
  console.log("Turso schema initialized.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to initialize Turso schema", error);
  process.exit(1);
});
